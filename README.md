# Crypto Graphs - Cryptocurrency Trading Platform

A comprehensive cryptocurrency trading web application with real-time price tracking, technical analysis, automated trading, and portfolio management.

## 🚀 Features

### 📊 Real-time Analytics
- Live cryptocurrency prices for BTC, ETH, and XRP
- Interactive price charts with multiple timeframes (1D, 7D, 30D, 90D)
- Moving averages (1, 2, 5, 9, 15 days) with trend indicators
- Historical price data visualization

### 💰 Mock Trading System
- Buy/sell transactions with real-time price execution
- Stop loss orders for risk management
- Trailing stop orders that adjust with price movements
- Portfolio tracking with unrealized P&L calculations

### 🔐 User Authentication
- Secure JWT-based authentication
- User registration and login
- Password hashing with bcrypt
- Rate limiting for security

### 📧 Email Notifications
- Transaction confirmation emails
- Stop loss/trailing stop execution alerts
- Welcome emails for new users
- Professional HTML email templates

### 🤖 Automated Trading Engine
- Background job processing with node-cron
- Real-time price monitoring every 30 seconds
- Automatic execution of stop loss and trailing stop orders
- Transaction logging and audit trail

### 📱 Modern UI/UX
- Responsive design with Tailwind CSS
- Real-time price updates with animations
- Interactive charts using Recharts
- Mobile-friendly interface

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** password hashing
- **node-cron** for background jobs
- **nodemailer** for email notifications
- **axios** for API requests

### Frontend
- **React** 18 with hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **React Hot Toast** for notifications
- **Lucide React** for icons

### APIs
- **CoinDesk API** for cryptocurrency data
- **SendGrid** for email delivery

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd crypto_graphs
```

### 2. Install backend dependencies
```bash
npm install
```

### 3. Install frontend dependencies
```bash
cd client
npm install
cd ..
```

### 4. Set up environment variables
Create a `.env` file in the root directory:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crypto_graphs
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_graphs
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@cryptographs.com

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 5. Set up PostgreSQL database
```sql
CREATE DATABASE crypto_graphs;
```

## 🎯 Quick Start

### Option 1: Automated Startup (Recommended)
Use the built-in startup script that checks database connectivity and starts both servers:

**Windows:**
```bash
start.bat
```

**All platforms:**
```bash
node start.js
```

The startup script will:
- ✅ Check if PostgreSQL is running
- ✅ Verify database connectivity
- ✅ Start the backend server (port 5000)
- ✅ Start the frontend React app (port 3000)
- ✅ Handle graceful shutdown with Ctrl+C

### Option 2: Manual Startup

#### Development mode (with hot reload):
```bash
# Terminal 1 - Start backend
npm run dev

# Terminal 2 - Start frontend
npm run client
```

#### Production mode:
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📊 Database Schema

The application uses the following PostgreSQL tables:

- **users** - User accounts and authentication
- **transactions** - Trading transactions and orders
- **portfolio** - User holdings and positions
- **moving_averages** - Calculated technical indicators
- **settings** - User preferences and notifications
- **logs** - System and transaction logs

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/me` - Get current user

### Cryptocurrency Data
- `GET /api/crypto/prices` - Get all current prices
- `GET /api/crypto/prices/:symbol` - Get specific coin price
- `GET /api/crypto/historical/:symbol` - Get historical data
- `GET /api/crypto/moving-averages` - Get moving averages

### Trading
- `POST /api/crypto/transactions` - Create transaction
- `GET /api/crypto/transactions` - Get user transactions
- `GET /api/crypto/portfolio` - Get user portfolio

## 🎯 Usage

### 1. User Registration
- Navigate to `/signup`
- Create an account with username, email, and password
- Receive welcome email

### 2. Dashboard
- View real-time cryptocurrency prices
- Analyze price charts with different timeframes
- Monitor moving averages and trends
- Execute buy/sell orders

### 3. Trading
- Select cryptocurrency (BTC, ETH, XRP)
- Choose transaction type (buy/sell)
- Enter quantity
- Set optional stop loss or trailing stop
- Execute transaction

### 4. Portfolio Management
- View current holdings and values
- Track unrealized profit/loss
- Monitor portfolio allocation
- Review transaction history

### 5. Automated Trading
- Set stop loss orders for risk management
- Use trailing stops to lock in profits
- Receive email notifications for executions
- Monitor automated trade logs

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- SQL injection prevention

## 📧 Email Configuration

The application uses Gmail SMTP for sending emails. To set up:

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in your `.env` file

## 🚀 Deployment

### Heroku
```bash
# Set up Heroku
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_secret
# ... set other environment variables

# Deploy
git push heroku main
```

### Docker
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This is a mock trading platform for educational purposes. No real money is involved in transactions. The application uses real cryptocurrency price data but all trading is simulated.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments

## 🔄 Updates

The application automatically:
- Updates prices every 30 seconds
- Calculates moving averages hourly
- Processes stop loss orders in real-time
- Sends email notifications for important events

---

**Happy Trading! 🚀📈** 