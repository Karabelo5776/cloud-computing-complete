const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
require('dotenv').config();

// Add this check:
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log(`Allowing requests from: ${frontendUrl}`); 
const app = express();
app.use(cors({
  origin: [
    'https://cloud-computing-complete.vercel.app', // Your live frontend
    'http://localhost:3000' // Keep for local development
  ],
  credentials: true
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority'
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Crash app if DB fails
});

// ========== MONGOOSE SCHEMAS ========== //

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true,
    enum: ['sales', 'finance', 'developer', 'investor', 'client', 'primary_partner']
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'],
    default: 'active'
  },
  twoFactorSecret: String,
  isTwoFactorEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const productPurchaseSchema = new mongoose.Schema({
  purchaseDate: { type: Date, default: Date.now },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  expenses: { type: Number, default: 0 },
  supplier: String,
  remainingQuantity: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  currentPrice: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  purchaseHistory: [productPurchaseSchema],
  createdAt: { type: Date, default: Date.now }
});

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  quantity: { type: Number, default: 1 },
  salePrice: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  customerEmail: String,
  customerName: String,
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: String,
  shippingAddress: String,
  saleDate: { type: Date, default: Date.now },
  rejectionReason: String
});

// Query Schema (unchanged)
const querySchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { 
    type: String, 
    required: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  message: { type: String, required: true },
  autoReply: String,
  status: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending'
  },
  responseType: {
    type: String,
    enum: ['auto', 'manual', null],
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});


const expenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  expenseDate: { type: Date, default: Date.now },
  description: String
});

const incomeStatementSchema = new mongoose.Schema({
  month: { type: String, required: true },
  year: { type: Number, required: true },
  totalRevenue: { type: Number, required: true },
  costOfGoodsSold: { type: Number, required: true },
  grossProfit: { type: Number, required: true },
  operatingExpenses: { type: Number, required: true },
  netProfit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

incomeStatementSchema.pre('save', function(next) {
  this.grossProfit = this.totalRevenue - this.costOfGoodsSold;
  this.netProfit = this.grossProfit - this.operatingExpenses;
  next();
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Query = mongoose.model('Query', querySchema);
const Expense = mongoose.model('Expense', expenseSchema);
const IncomeStatement = mongoose.model('IncomeStatement', incomeStatementSchema);

// ========== MIDDLEWARE ========== //
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    
    // Check if this is a temporary 2FA token being used incorrectly
    if (decoded.requires2FA) {
      return res.status(403).json({ 
        message: "2FA verification required",
        requires2FA: true
      });
    }
    
    req.user = decoded;
    next();
  });
};

// Middleware to check if 2FA is required
const check2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isTwoFactorEnabled && !req.user.is2FAAuthenticated) {
      return res.status(403).json({ 
        message: "2FA verification required",
        requires2FA: true
      });
    }

    next();
  } catch (error) {
    console.error("2FA Check Error:", error);
    res.status(500).json({ message: "Server error during 2FA check" });
  }
};

// ========== HELPER FUNCTIONS ========== //
const calculateFIFOCost = async (productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  let remainingQty = quantity;
  let totalCost = 0;
  
  const purchases = product.purchaseHistory
    .filter(p => p.remainingQuantity > 0)
    .sort((a, b) => a.purchaseDate - b.purchaseDate);

  for (const purchase of purchases) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, purchase.remainingQuantity);
    totalCost += qtyToUse * purchase.unitCost;
    purchase.remainingQuantity -= qtyToUse;
    remainingQty -= qtyToUse;
  }

  if (remainingQty > 0) {
    throw new Error(`Not enough inventory for product ${product.name}`);
  }

  await product.save();
  return totalCost;
};


// Enhanced Auto-reply function
// Enhanced Auto-reply function
const getAutoReply = async (message) => {
  try {
    // Check for common questions with predefined answers
    const commonQuestions = {
      "hours": "Our business hours are Monday to Friday, 9am to 5pm.",
      "delivery": "Standard delivery takes 3-5 business days. Express delivery is available for an additional fee.",
      "return": "You can return items within 30 days of purchase with original receipt.",
      "contact": "You can reach our support team at support@example.com or call +1 (555) 123-4567.",
      "price": "For pricing information, please visit our products page."
    };

    // Check if message contains any common keywords
    const lowerMessage = message.toLowerCase();
    for (const [keyword, reply] of Object.entries(commonQuestions)) {
      if (lowerMessage.includes(keyword)) {
        return reply;
      }
    }

    // First try to find similar messages that were manually responded to
    const manualResponses = await Query.find({
      responseType: 'manual',
      autoReply: { $exists: true, $ne: null }
    }).sort({ createdAt: -1 }).limit(50);

    // Find the most similar manual response
    let bestMatch = null;
    let bestScore = 0;
    const messageWords = lowerMessage.split(/\s+/);
    
    for (const response of manualResponses) {
      const responseWords = response.message.toLowerCase().split(/\s+/);
      const commonWords = messageWords.filter(word => 
        responseWords.includes(word) && word.length > 3
      ).length;
      
      const score = commonWords / Math.max(messageWords.length, responseWords.length);
      
      if (score > bestScore && score > 0.3) { // Only consider matches with >30% similarity
        bestScore = score;
        bestMatch = response;
      }
    }

    if (bestMatch) {
      return bestMatch.autoReply;
    }

    // Fallback to text search if no good manual match found
    const textSearchResult = await Query.findOne(
      { $text: { $search: message }, responseType: 'manual' },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });

    if (textSearchResult && textSearchResult.autoReply) {
      return textSearchResult.autoReply;
    }

    return null;
  } catch (error) {
    console.error("Error finding auto-reply:", error);
    return null;
  }
};

//===========Appended before the routes==========//==/
// Trust proxy for HTTPS (essential for Vercel+Render)
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    frontend: process.env.FRONTEND_URL,
    environment: process.env.NODE_ENV 
  });
});

// ========== AUTHENTICATION ROUTES ========== //
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const validRoles = ["sales", "finance", "developer", "investor", "client", "primary_partner"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role selection!" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Password must contain: 8+ characters, uppercase, lowercase, number, and special character"
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const roleLimits = {
      sales: 3,
      finance: 3,
      developer: 3,
      investor: 10,
      client: 100,
      primary_partner: 3
    };

    const roleCount = await User.countDocuments({ role });
    if (roleCount >= (roleLimits[role] || 3)) {
      return res.status(403).json({ 
        message: `Registration denied. Max ${roleLimits[role] || 3} ${role} accounts allowed.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await newUser.save();

    res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      user: { name, email, role }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: "Invalid role selection!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If 2FA is enabled, return a temporary token that can only be used for 2FA verification
    if (user.isTwoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, role: user.role, requires2FA: true }, 
        process.env.JWT_SECRET || "secretkey", 
        { expiresIn: '5m' } // Short-lived token for 2FA verification
      );

      return res.json({ 
        tempToken,
        requires2FA: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // Regular token if 2FA is not enabled
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || "secretkey", 
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login!" });
  }
});

// 2FA verification route
app.post('/2fa/verify-login', async (req, res) => {
  const { tempToken, token } = req.body;

  try {
    // Verify the temporary token
    jwt.verify(tempToken, process.env.JWT_SECRET || "secretkey", async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      if (!decoded.requires2FA) {
        return res.status(400).json({ message: "Not a 2FA verification token" });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify the 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds before and after
      });

      if (!verified) {
        return res.status(400).json({ message: "Invalid 2FA token" });
      }

      // Generate final access token
      const finalToken = jwt.sign(
        { id: user._id, role: user.role, is2FAAuthenticated: true }, 
        process.env.JWT_SECRET || "secretkey", 
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      res.json({ 
        token: finalToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error("2FA Login Verification Error:", error);
    res.status(500).json({ message: "Server error during 2FA verification" });
  }
});

// ========== 2FA ROUTES ========== //

// Generate 2FA secret and QR code
app.post('/2fa/setup', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: `YourAppName (${user.email})`
    });

    // Generate QR code URL
    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        console.error("QR Code generation error:", err);
        return res.status(500).json({ message: "Error generating QR code" });
      }

      // Save the secret temporarily (don't enable 2FA yet)
      user.twoFactorSecret = secret.base32;
      user.save();

      res.json({
        secret: secret.base32,
        qrCode: data_url
      });
    });
  } catch (error) {
    console.error("2FA Setup Error:", error);
    res.status(500).json({ message: "Server error during 2FA setup" });
  }
});

// Verify 2FA token and enable 2FA
app.post('/2fa/verify', verifyToken, async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not set up yet" });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 30 seconds before and after
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Enable 2FA for this user
    user.isTwoFactorEnabled = true;
    await user.save();

    res.json({ 
      success: true,
      message: "2FA enabled successfully"
    });
  } catch (error) {
    console.error("2FA Verification Error:", error);
    res.status(500).json({ message: "Server error during 2FA verification" });
  }
});

// Disable 2FA
app.post('/2fa/disable', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: "2FA disabled successfully"
    });
  } catch (error) {
    console.error("2FA Disable Error:", error);
    res.status(500).json({ message: "Server error during 2FA disable" });
  }
});

app.get('/profile', verifyToken, check2FA, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRODUCT ROUTES ========== //
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/products/purchase', verifyToken, async (req, res) => {
  const { productId, quantity, unitCost, expenses, supplier, price } = req.body;

  try {
    let product;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
    } else {
      // Create new product if no ID provided
      product = new Product({
        name: req.body.name || `Product-${Date.now()}`,
        description: req.body.description,
        currentPrice: price,
        quantity: 0
      });
    }

    product.purchaseHistory.push({
      quantity,
      unitCost,
      expenses,
      supplier,
      remainingQuantity: quantity
    });

    product.quantity += quantity;
    if (price) product.currentPrice = price;

    await product.save();

    res.json({ 
      message: "Purchase recorded",
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, price } = req.body;

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, description, currentPrice: price },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated successfully!", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SALES ROUTES ========== //
app.get('/sales', verifyToken, async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('productId', 'name currentPrice')
      .sort({ saleDate: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/sales', verifyToken, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ error: "Not enough stock available" });
    }

    const totalCost = await calculateFIFOCost(productId, quantity);
    const totalPrice = product.currentPrice * quantity;

    const newSale = new Sale({
      userId: req.user.id,
      productId,
      productName: product.name,
      quantity,
      salePrice: product.currentPrice,
      purchasePrice: totalCost / quantity,
      totalPrice,
      orderStatus: 'completed'
    });

    await newSale.save();

    product.quantity -= quantity;
    await product.save();

    res.json({ 
      message: "Sale recorded successfully!",
      sale: newSale
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/place-order", verifyToken, async (req, res) => {
  const { productId, quantity, email, name } = req.body;

  if (!productId || !quantity || quantity < 1 || !email || !name) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ 
        error: `Only ${product.quantity} units available`,
        availableStock: product.quantity
      });
    }

    const totalCost = await calculateFIFOCost(productId, quantity);
    const totalPrice = product.currentPrice * quantity;

    const newSale = new Sale({
      productId,
      quantity,
      salePrice: product.currentPrice,
      purchasePrice: totalCost / quantity,
      totalPrice,
      customerEmail: email,
      customerName: name,
      productName: product.name,
      orderStatus: 'completed'
    });

    await newSale.save();

    product.quantity -= quantity;
    await product.save();

    res.json({ 
      message: "Order placed successfully",
      orderId: newSale._id,
      totalPrice,
      remainingStock: product.quantity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== INCOME STATEMENT ROUTES ========== //
app.post('/income-statements/generate', verifyToken, async (req, res) => {
  const { month, year } = req.body;

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Calculate total revenue
    const revenueResult = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
          orderStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" }
        }
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Calculate COGS
    const cogsResult = await Sale.aggregate([
      {
        $match: {
          saleDate: { $gte: startDate, $lte: endDate },
          orderStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ["$purchasePrice", "$quantity"] } }
        }
      }
    ]);
    const costOfGoodsSold = cogsResult[0]?.totalCost || 0;

    // Calculate operating expenses
    const productExpensesResult = await Product.aggregate([
      { $unwind: "$purchaseHistory" },
      { 
        $match: { 
          "purchaseHistory.purchaseDate": { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$purchaseHistory.expenses" }
        }
      }
    ]);
    const productExpenses = productExpensesResult[0]?.totalExpenses || 0;

    const standaloneExpensesResult = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" }
        }
      }
    ]);
    const standaloneExpenses = standaloneExpensesResult[0]?.totalExpenses || 0;

    const operatingExpenses = productExpenses + standaloneExpenses;

    // Create or update income statement
    const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
    let incomeStatement = await IncomeStatement.findOne({ month: monthStr });

    if (incomeStatement) {
      incomeStatement.totalRevenue = totalRevenue;
      incomeStatement.costOfGoodsSold = costOfGoodsSold;
      incomeStatement.operatingExpenses = operatingExpenses;
    } else {
      incomeStatement = new IncomeStatement({
        month: monthStr,
        year,
        totalRevenue,
        costOfGoodsSold,
        operatingExpenses
      });
    }

    await incomeStatement.save();

    res.json(incomeStatement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/income-statements/:month', verifyToken, async (req, res) => {
  try {
    const incomeStatement = await IncomeStatement.findOne({ 
      month: req.params.month 
    });
    
    if (!incomeStatement) {
      return res.status(404).json({ error: "Income statement not found" });
    }
    
    res.json(incomeStatement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== FINANCE ROUTES ========== //
// ========== FINANCE ROUTES ========== //
app.get("/finance/summary", verifyToken, async (req, res) => {
  const { period } = req.query;
  
  try {
    let dateCondition = {};
    const now = new Date();
    
    // Date range setup (same as before)
    switch (period) {
      case "daily":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999))
          }
        };
        break;
      case "weekly":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        endOfWeek.setHours(23, 59, 59, 999);
        dateCondition = {
          saleDate: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        };
        break;
      case "monthly":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          }
        };
        break;
      case "yearly":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          }
        };
        break;
      default:
        dateCondition = {};
    }

    // Get completed sales
    const sales = await Sale.find({
      ...dateCondition,
      orderStatus: 'completed'
    });

    // Calculate sales metrics
    const revenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const costOfGoodsSold = sales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
    const grossProfit = revenue - costOfGoodsSold;

    // Get ALL purchase-related expenses (both unit costs and additional expenses)
    const purchaseExpenses = await Product.aggregate([
      { $unwind: "$purchaseHistory" },
      { 
        $match: dateCondition.saleDate ? { 
          "purchaseHistory.purchaseDate": dateCondition.saleDate 
        } : {} 
      },
      {
        $group: {
          _id: null,
          totalUnitCosts: { 
            $sum: { 
              $multiply: [
                "$purchaseHistory.quantity", 
                "$purchaseHistory.unitCost"
              ] 
            } 
          },
          totalAdditionalExpenses: { $sum: "$purchaseHistory.expenses" }
        }
      }
    ]);

    // Get standalone expenses
    const standaloneExpenses = await Expense.aggregate([
      {
        $match: dateCondition.saleDate ? { 
          expenseDate: dateCondition.saleDate 
        } : {}
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    // Combine all expenses
    const purchaseExpensesData = purchaseExpenses[0] || { totalUnitCosts: 0, totalAdditionalExpenses: 0 };
    const standaloneExpensesTotal = standaloneExpenses[0]?.total || 0;
    
    // Total operating expenses includes both purchase-related additional expenses and standalone expenses
    const operatingExpenses = purchaseExpensesData.totalAdditionalExpenses + standaloneExpensesTotal;

    // Net profit calculation
    const netProfit = grossProfit - operatingExpenses;

    res.json({
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      netProfit,
      expenseBreakdown: {
        productPurchases: purchaseExpensesData.totalAdditionalExpenses,
        otherExpenses: standaloneExpensesTotal,
        totalPurchaseCosts: purchaseExpensesData.totalUnitCosts
      }
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    res.status(500).json({ 
      error: "Failed to generate financial summary",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
/*app.get("/finance/summary", verifyToken, async (req, res) => {
  const { period } = req.query;
  
  try {
    let dateCondition = {};
    const now = new Date();
    
    switch (period) {
      case "daily":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999))
          }
        };
        break;
      case "weekly":
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        endOfWeek.setHours(23, 59, 59, 999);
        
        dateCondition = {
          saleDate: {
            $gte: startOfWeek,
            $lt: endOfWeek
          }
        };
        break;
      case "monthly":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          }
        };
        break;
      case "yearly":
        dateCondition = {
          saleDate: {
            $gte: new Date(now.getFullYear(), 0, 1),
            $lt: new Date(now.getFullYear() + 1, 0, 1)
          }
        };
        break;
      default:
        dateCondition = {};
    }

    const sales = await Sale.find({
      ...dateCondition,
      orderStatus: 'completed'
    });

    const revenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const costOfGoodsSold = sales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
    const grossProfit = revenue - costOfGoodsSold;

    const expenses = await Expense.aggregate([
      {
        $match: dateCondition.expenseDate ? { 
          expenseDate: dateCondition.saleDate 
        } : {}
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    
    const operatingExpenses = expenses[0]?.total || 0;
    const netProfit = grossProfit - operatingExpenses;

    res.json({
      revenue,
      costOfGoodsSold,
      grossProfit,
      operatingExpenses,
      netProfit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

app.get('/finance/revenue', verifyToken, async (req, res) => {
  try {
    const result = await Sale.aggregate([
      {
        $match: { orderStatus: 'completed' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" }
        }
      }
    ]);
    
    const totalRevenue = result.length > 0 ? result[0].totalRevenue : 0;
    res.json({ total_revenue: totalRevenue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/finance/expenses', verifyToken, async (req, res) => {
  try {
    // Product purchase expenses
    const productExpenses = await Product.aggregate([
      { $unwind: "$purchaseHistory" },
      {
        $group: {
          _id: null,
          total: { $sum: "$purchaseHistory.expenses" }
        }
      }
    ]);
    
    // Standalone expenses
    const standaloneExpenses = await Expense.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalProductExpenses = productExpenses[0]?.total || 0;
    const totalStandaloneExpenses = standaloneExpenses[0]?.total || 0;

    res.json({ 
      total_expenses: totalProductExpenses + totalStandaloneExpenses,
      product_expenses: totalProductExpenses,
      standalone_expenses: totalStandaloneExpenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/investor/monthly-sales', verifyToken, async (req, res) => {
  try {
    const monthlySales = await Sale.aggregate([
      {
        $match: { orderStatus: 'completed' }
      },
      {
        $group: {
          _id: {
            year: { $year: "$saleDate" },
            month: { $month: "$saleDate" }
          },
          totalSales: { $sum: "$totalPrice" },
          totalCost: { $sum: { $multiply: ["$purchasePrice", "$quantity"] } }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $toString: { $lpad: ["$_id.month", 2, "0"] } }
            ]
          },
          totalSales: 1,
          totalCost: 1,
          grossProfit: { $subtract: ["$totalSales", "$totalCost"] }
        }
      },
      { $sort: { month: 1 } }
    ]);

    res.json(monthlySales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EXPENSE ROUTES ========== //
app.post('/expenses', verifyToken, async (req, res) => {
  const { category, amount, description } = req.body;

  try {
    const newExpense = new Expense({
      category,
      amount,
      description
    });

    await newExpense.save();

    res.json({ 
      message: "Expense recorded successfully",
      expense: newExpense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/expenses', verifyToken, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ expenseDate: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== QUERY ROUTES ========== //
// ========== QUERY ROUTES ========== //
// Submit Query Endpoint
// Submit Query Endpoint (unchanged)
app.post("/api/submit-query", verifyToken, async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const autoReply = await getAutoReply(message);
    const status = autoReply ? "complete" : "pending";

    const newQuery = new Query({
      customerName: name,
      customerEmail: email,
      message,
      autoReply,
      status,
      responseType: autoReply ? 'auto' : null
    });

    await newQuery.save();

    res.status(201).json({
      message: autoReply || "Your query has been received and is under review.",
      query: newQuery
    });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get client queries
app.get("/api/my-queries", verifyToken, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const queries = await Query.find({ customerEmail: email })
      .sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    console.error("Error fetching client queries:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all queries (admin)
app.get("/queries", verifyToken, async (req, res) => {
  try {
    const queries = await Query.find().sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    console.error("Error fetching queries:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/queries/pending", verifyToken, async (req, res) => {
  try {
    const queries = await Query.find({ status: 'pending' });
    res.json(queries);
  } catch (error) {
    console.error("Error fetching pending queries:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Respond to Query Endpoint
app.post("/queries/respond", verifyToken, async (req, res) => {
  const { queryId, response } = req.body;

  if (!queryId || !response) {
    return res.status(400).json({ error: "Query ID and response are required" });
  }

  try {
    const updatedQuery = await Query.findByIdAndUpdate(
      queryId,
      { 
        autoReply: response,
        status: 'complete',
        responseType: 'manual'
      },
      { new: true }
    );

    if (!updatedQuery) {
      return res.status(404).json({ error: "Query not found" });
    }

    res.json({ 
      message: "Response sent successfully!",
      query: updatedQuery
    });
  } catch (error) {
    console.error("Error updating query:", error);
    res.status(500).json({ error: "Failed to send response" });
  }
});

app.get("/api/query-stats", verifyToken, async (req, res) => {
  try {
    const stats = await Query.aggregate([
      {
        $group: {
          _id: null,
          totalQueries: { $sum: 1 },
          pendingQueries: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          completedQueries: {
            $sum: { $cond: [{ $eq: ["$status", "complete"] }, 1, 0] }
          },
          autoReplied: {
            $sum: { $cond: [{ $ifNull: ["$autoReply", false] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalQueries: 0,
      pendingQueries: 0,
      completedQueries: 0,
      autoReplied: 0
    };

    res.json(result);
  } catch (error) {
    console.error("Error fetching query stats:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ========== CLIENT SALES ROUTE ========== //
app.post('/api/place-sale', verifyToken, async (req, res) => {
  const { client_name, client_email, product_id, quantity } = req.body;

  if (!client_name || !client_email || !product_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: "Invalid purchase data" });
  }

  try {
    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (quantity > product.quantity) {
      return res.status(400).json({ 
        error: `Only ${product.quantity} units available`,
        availableStock: product.quantity
      });
    }

    const totalCost = await calculateFIFOCost(product_id, quantity);
    const totalPrice = product.currentPrice * quantity;

    const newSale = new Sale({
      productId: product_id,
      quantity,
      salePrice: product.currentPrice,
      purchasePrice: totalCost / quantity,
      totalPrice,
      customerEmail: client_email,
      customerName: client_name,
      productName: product.name,
      orderStatus: 'completed'
    });

    await newSale.save();

    product.quantity -= quantity;
    await product.save();

    res.json({ 
      message: "Purchase placed successfully!",
      totalPrice,
      remainingStock: product.quantity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SYSTEM ROUTES ========== //
app.get("/api/system-status", (req, res) => {
  res.json({
    database: "MongoDB Connected",
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development"
  });
});

app.get('/', (req, res) => {
  res.send('API is running...');
});

// ========== CLIENT PURCHASES ROUTE ========== //
app.get('/api/client-purchases', verifyToken, async (req, res) => {
  const { status, startDate, endDate, email } = req.query;
  
  try {
    let query = { customerEmail: { $exists: true } };
    const params = [];

    if (email) {
      query.customerEmail = email;
    }
    
    if (status && status !== 'all') {
      query.orderStatus = status;
    }
    
    if (startDate) {
      query.saleDate = query.saleDate || {};
      query.saleDate.$gte = new Date(startDate);
    }
    
    if (endDate) {
      query.saleDate = query.saleDate || {};
      query.saleDate.$lte = new Date(endDate);
    }

    const purchases = await Sale.find(query)
      .sort({ saleDate: -1 });

    res.json(purchases);
  } catch (error) {
    console.error('Error fetching client purchases:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ========== ORDER STATUS UPDATE ========== //
app.put('/sales/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  
  if (!['processing', 'purchased', 'refunded', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updateData = { orderStatus: status };
    if (status === 'cancelled') {
      updateData.rejectionReason = reason;
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ========== PRIMARY PARTNER ROUTES ========== //
app.get('/primary-partner/financial-summary', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Monthly sales
    const monthlySales = await Sale.find({
      saleDate: { $gte: startOfMonth, $lte: endOfMonth },
      orderStatus: 'completed'
    });

    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const monthlyCOGS = monthlySales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
    const monthlyGrossProfit = monthlyRevenue - monthlyCOGS;

    // Monthly expenses
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    const totalMonthlyExpenses = monthlyExpenses[0]?.total || 0;

    // Yearly summary
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const yearlySales = await Sale.find({
      saleDate: { $gte: startOfYear, $lte: endOfYear },
      orderStatus: 'completed'
    });

    const yearlyRevenue = yearlySales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const yearlyCOGS = yearlySales.reduce((sum, sale) => sum + (sale.purchasePrice * sale.quantity), 0);
    const yearlyGrossProfit = yearlyRevenue - yearlyCOGS;

    const yearlyExpenses = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    const totalYearlyExpenses = yearlyExpenses[0]?.total || 0;

    res.json({
      monthly: {
        revenue: monthlyRevenue,
        costOfGoodsSold: monthlyCOGS,
        grossProfit: monthlyGrossProfit,
        expenses: totalMonthlyExpenses,
        netProfit: monthlyGrossProfit - totalMonthlyExpenses
      },
      yearly: {
        revenue: yearlyRevenue,
        costOfGoodsSold: yearlyCOGS,
        grossProfit: yearlyGrossProfit,
        expenses: totalYearlyExpenses,
        netProfit: yearlyGrossProfit - totalYearlyExpenses
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/primary-partner/recent-sales', verifyToken, async (req, res) => {
  try {
    const recentSales = await Sale.find()
      .populate('productId', 'name currentPrice')
      .sort({ saleDate: -1 })
      .limit(10);
    
    res.json(recentSales);
  } catch (error) {
    console.error("Primary Partner Recent Sales Error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/primary-partner/inventory-status', verifyToken, async (req, res) => {
  try {
    const lowInventory = await Product.find()
      .sort({ quantity: 1 })
      .limit(10);
    
    res.json(lowInventory);
  } catch (error) {
    console.error("Primary Partner Inventory Error:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// ========== DEVELOPER SYSTEM HEALTH APIS ========== //
app.get('/developer/system-health', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const counts = await Promise.all([
      User.countDocuments(),
      Sale.countDocuments(),
      Query.countDocuments(),
      Product.countDocuments()
    ]);

    res.json({
      database: {
        connections: mongoose.connections.length,
        uptime: Math.floor(process.uptime() / 3600) + ' hours',
        queries: counts[2],
        sales: counts[1],
        users: counts[0],
        products: counts[3]
      },
      server: {
        status: 'online',
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      error: "Failed to get system health",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      fallbackData: {
        database: {
          connections: 0,
          uptime: 'N/A',
          queries: 0,
          sales: 0,
          users: 0,
          products: 0
        },
        server: {
          status: 'error',
          memory: {
            total: 0,
            used: 0,
            rss: 0
          },
          uptime: 0
        }
      }
    });
  }
});

app.get('/developer/error-logs', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const logs = await Query.find({ status: 'error' })
      .sort({ createdAt: -1 })
      .limit(10);

    if (!logs.length) {
      return res.json([
        {
          id: 1,
          message: 'No error logs found in database',
          level: 'INFO',
          service: 'System',
          timestamp: new Date().toISOString()
        }
      ]);
    }

    res.json(logs);
  } catch (error) {
    console.error('Error logs error:', error);
    res.json([
      {
        id: -1,
        message: 'Failed to fetch error logs: ' + error.message,
        level: 'ERROR',
        service: 'API',
        timestamp: new Date().toISOString()
      }
    ]);
  }
});

// ========== DEVELOPER USER MANAGEMENT ========== //
app.get('/developer/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/developer/users/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;
  const { name, email, role } = req.body;

  try {
    const validRoles = ["sales", "finance", "developer", "investor", "client", "primary_partner"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/developer/users/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'developer') {
      const devCount = await User.countDocuments({ role: 'developer' });
      if (devCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete last developer' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========== DEVELOPER QUERY MANAGEMENT ========== //
app.get('/developer/queries', verifyToken, async (req, res) => {
  if (req.user.role !== 'developer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const queries = await Query.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(queries);
  } catch (error) {
    console.error('Query fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

//========Appended /////========Daily sales endpoint
app.get('/investor/monthly-sales', verifyToken, async (req, res) => {
  try {
      console.log('Starting monthly sales aggregation...');
      
      const monthlySales = await Sale.aggregate([
          {
              $match: { 
                  orderStatus: 'completed',
                  saleDate: { $exists: true, $type: 'date' }, // Ensure saleDate exists
                  totalPrice: { $exists: true, $type: 'number' },
                  purchasePrice: { $exists: true, $type: 'number' },
                  quantity: { $exists: true, $type: 'number' }
              }
          },
          {
              $group: {
                  _id: {
                      year: { $year: "$saleDate" },
                      month: { $month: "$saleDate" }
                  },
                  totalSales: { $sum: "$totalPrice" },
                  totalCost: { $sum: { $multiply: ["$purchasePrice", "$quantity"] } }
              }
          },
          {
              $project: {
                  _id: 0,
                  month: {
                      $concat: [
                          { $toString: "$_id.year" },
                          "-",
                          { $toString: { $lpad: ["$_id.month", 2, "0"] } }
                      ]
                  },
                  totalSales: 1,
                  totalCost: 1,
                  grossProfit: { $subtract: ["$totalSales", "$totalCost"] }
              }
          },
          { $sort: { month: 1 } }
      ]);

      console.log('Aggregation result:', JSON.stringify(monthlySales, null, 2));
      
      if (!monthlySales || monthlySales.length === 0) {
          console.warn('No sales data found');
          return res.json([]);
      }

      res.json(monthlySales);
      
  } catch (error) {
      console.error('Aggregation error:', error);
      res.status(500).json({ 
          error: 'Failed to process monthly sales',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
  }
});

//============
// Add this to your server.js in the investor routes section
app.get('/investor/monthly-trends', verifyToken, async (req, res) => {
  try {
      const now = new Date();
      const currentYear = now.getFullYear();

      const monthlyData = await Sale.aggregate([
          {
              $match: {
                  orderStatus: 'completed',
                  saleDate: {
                      $gte: new Date(currentYear, 0, 1),
                      $lt: new Date(currentYear + 1, 0, 1)
                  }
              }
          },
          {
              $group: {
                  _id: { $month: "$saleDate" },
                  totalRevenue: { $sum: "$totalPrice" },
                  totalCost: { $sum: { $multiply: ["$purchasePrice", "$quantity"] } }
              }
          },
          {
              $project: {
                  month: {
                      $let: {
                          vars: {
                              monthsIn: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                          },
                          in: { $arrayElemAt: ["$$monthsIn", { $subtract: ["$_id", 1] }] }
                      }
                  },
                  totalRevenue: 1,
                  grossProfit: { $subtract: ["$totalRevenue", "$totalCost"] }
              }
          },
          { $sort: { "_id": 1 } }
      ]);

      res.json(monthlyData);
  } catch (error) {
      console.error('Monthly trends error:', error);
      res.status(500).json({ 
          error: "Failed to generate monthly trends",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`
  Server running in ${process.env.NODE_ENV || 'development'}
  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
  Listening on port ${PORT}
  `);
});

/*
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// ========== MONGOOSE SCHEMAS ========== //

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true,
    enum: ['sales', 'finance', 'developer', 'investor', 'client', 'primary_partner']
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'],
    default: 'active'
  },
  twoFactorSecret: String,
  isTwoFactorEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const productPurchaseSchema = new mongoose.Schema({
  purchaseDate: { type: Date, default: Date.now },
  quantity: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  expenses: { type: Number, default: 0 },
  supplier: String,
  remainingQuantity: { type: Number, required: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  currentPrice: { type: Number, required: true },
  quantity: { type: Number, default: 0 },
  purchaseHistory: [productPurchaseSchema],
  createdAt: { type: Date, default: Date.now }
});

const saleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  quantity: { type: Number, default: 1 },
  salePrice: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  customerEmail: String,
  customerName: String,
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: String,
  shippingAddress: String,
  saleDate: { type: Date, default: Date.now },
  rejectionReason: String
});

const querySchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerEmail: { 
    type: String, 
    required: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  message: { type: String, required: true },
  autoReply: String,
  status: {
    type: String,
    enum: ['pending', 'complete'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

const expenseSchema = new mongoose.Schema({
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  expenseDate: { type: Date, default: Date.now },
  description: String
});

const incomeStatementSchema = new mongoose.Schema({
  month: { type: String, required: true },
  year: { type: Number, required: true },
  totalRevenue: { type: Number, required: true },
  costOfGoodsSold: { type: Number, required: true },
  grossProfit: { type: Number, required: true },
  operatingExpenses: { type: Number, required: true },
  netProfit: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

incomeStatementSchema.pre('save', function(next) {
  this.grossProfit = this.totalRevenue - this.costOfGoodsSold;
  this.netProfit = this.grossProfit - this.operatingExpenses;
  next();
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Query = mongoose.model('Query', querySchema);
const Expense = mongoose.model('Expense', expenseSchema);
const IncomeStatement = mongoose.model('IncomeStatement', incomeStatementSchema);

// ========== MIDDLEWARE ========== //
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    
    // Check if this is a temporary 2FA token being used incorrectly
    if (decoded.requires2FA) {
      return res.status(403).json({ 
        message: "2FA verification required",
        requires2FA: true
      });
    }
    
    req.user = decoded;
    next();
  });
};

// Middleware to check if 2FA is required
const check2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isTwoFactorEnabled && !req.user.is2FAAuthenticated) {
      return res.status(403).json({ 
        message: "2FA verification required",
        requires2FA: true
      });
    }

    next();
  } catch (error) {
    console.error("2FA Check Error:", error);
    res.status(500).json({ message: "Server error during 2FA check" });
  }
};

// ========== HELPER FUNCTIONS ========== //
const calculateFIFOCost = async (productId, quantity) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");

  let remainingQty = quantity;
  let totalCost = 0;
  
  const purchases = product.purchaseHistory
    .filter(p => p.remainingQuantity > 0)
    .sort((a, b) => a.purchaseDate - b.purchaseDate);

  for (const purchase of purchases) {
    if (remainingQty <= 0) break;
    
    const qtyToUse = Math.min(remainingQty, purchase.remainingQuantity);
    totalCost += qtyToUse * purchase.unitCost;
    purchase.remainingQuantity -= qtyToUse;
    remainingQty -= qtyToUse;
  }

  if (remainingQty > 0) {
    throw new Error(`Not enough inventory for product ${product.name}`);
  }

  await product.save();
  return totalCost;
};

const getAutoReply = async (message) => {
  try {
    // First try text search
    const result = await Query.findOne(
      { $text: { $search: message } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });

    if (result) {
      return result.autoReply;
    }

    // Fallback to regex search if text search doesn't find anything
    const regexResult = await Query.findOne({
      message: { $regex: message, $options: 'i' }
    }).sort({ createdAt: -1 });

    return regexResult ? regexResult.autoReply : null;
  } catch (error) {
    console.error("Error finding auto-reply:", error);
    return null;
  }
};

// ========== AUTHENTICATION ROUTES ========== //
app.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const validRoles = ["sales", "finance", "developer", "investor", "client", "primary_partner"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role selection!" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Password must contain: 8+ characters, uppercase, lowercase, number, and special character"
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const roleLimits = {
      sales: 3,
      finance: 3,
      developer: 3,
      investor: 10,
      client: 100,
      primary_partner: 3
    };

    const roleCount = await User.countDocuments({ role });
    if (roleCount >= (roleLimits[role] || 3)) {
      return res.status(403).json({ 
        message: `Registration denied. Max ${roleLimits[role] || 3} ${role} accounts allowed.`
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await newUser.save();

    res.status(201).json({ 
      success: true,
      message: "User registered successfully",
      user: { name, email, role }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.role !== role) {
      return res.status(403).json({ message: "Invalid role selection!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // If 2FA is enabled, return a temporary token that can only be used for 2FA verification
    if (user.isTwoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user._id, role: user.role, requires2FA: true }, 
        process.env.JWT_SECRET || "secretkey", 
        { expiresIn: '5m' } // Short-lived token for 2FA verification
      );

      return res.json({ 
        tempToken,
        requires2FA: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // Regular token if 2FA is not enabled
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET || "secretkey", 
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ 
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login!" });
  }
});

// 2FA verification route
app.post('/2fa/verify-login', async (req, res) => {
  const { tempToken, token } = req.body;

  try {
    // Verify the temporary token
    jwt.verify(tempToken, process.env.JWT_SECRET || "secretkey", async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }

      if (!decoded.requires2FA) {
        return res.status(400).json({ message: "Not a 2FA verification token" });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify the 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30 seconds before and after
      });

      if (!verified) {
        return res.status(400).json({ message: "Invalid 2FA token" });
      }

      // Generate final access token
      const finalToken = jwt.sign(
        { id: user._id, role: user.role, is2FAAuthenticated: true }, 
        process.env.JWT_SECRET || "secretkey", 
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      res.json({ 
        token: finalToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error("2FA Login Verification Error:", error);
    res.status(500).json({ message: "Server error during 2FA verification" });
  }
});

// ========== 2FA ROUTES ========== //

// Generate 2FA secret and QR code
app.post('/2fa/setup', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: `YourAppName (${user.email})`
    });

    // Generate QR code URL
    QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        console.error("QR Code generation error:", err);
        return res.status(500).json({ message: "Error generating QR code" });
      }

      // Save the secret temporarily (don't enable 2FA yet)
      user.twoFactorSecret = secret.base32;
      user.save();

      res.json({
        secret: secret.base32,
        qrCode: data_url
      });
    });
  } catch (error) {
    console.error("2FA Setup Error:", error);
    res.status(500).json({ message: "Server error during 2FA setup" });
  }
});

// Verify 2FA token and enable 2FA
app.post('/2fa/verify', verifyToken, async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA not set up yet" });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1 // Allow 30 seconds before and after
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid token" });
    }

    // Enable 2FA for this user
    user.isTwoFactorEnabled = true;
    await user.save();

    res.json({ 
      success: true,
      message: "2FA enabled successfully"
    });
  } catch (error) {
    console.error("2FA Verification Error:", error);
    res.status(500).json({ message: "Server error during 2FA verification" });
  }
});

// Disable 2FA
app.post('/2fa/disable', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: "2FA disabled successfully"
    });
  } catch (error) {
    console.error("2FA Disable Error:", error);
    res.status(500).json({ message: "Server error during 2FA disable" });
  }
});

app.get('/profile', verifyToken, check2FA, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});*/
