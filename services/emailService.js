const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send transaction notification email
  async sendTransactionNotification(userEmail, username, transaction) {
    try {
      const { type, coin_symbol, quantity, price_at_transaction, stop_limit, trailing_stop_pct } = transaction;
      
      const subject = `Crypto Transaction: ${type.toUpperCase()} ${quantity} ${coin_symbol}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; text-align: center;">Crypto Graphs</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Transaction Confirmation</h2>
            
            <p>Hello ${username},</p>
            
            <p>Your ${type} transaction has been executed successfully:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Type:</td>
                  <td style="padding: 8px 0; color: #333;">${type.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Coin:</td>
                  <td style="padding: 8px 0; color: #333;">${coin_symbol}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Quantity:</td>
                  <td style="padding: 8px 0; color: #333;">${quantity}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Price:</td>
                  <td style="padding: 8px 0; color: #333;">$${parseFloat(price_at_transaction).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Total Value:</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold;">$${(quantity * price_at_transaction).toLocaleString()}</td>
                </tr>
                ${stop_limit ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Stop Limit:</td>
                  <td style="padding: 8px 0; color: #333;">$${parseFloat(stop_limit).toLocaleString()}</td>
                </tr>
                ` : ''}
                ${trailing_stop_pct ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Trailing Stop:</td>
                  <td style="padding: 8px 0; color: #333;">${trailing_stop_pct}%</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Transaction ID: ${transaction.id}<br>
              Date: ${new Date(transaction.created_at).toLocaleString()}
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dashboard
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from Crypto Graphs.<br>
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cryptographs.com',
        to: userEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Transaction notification email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('Error sending transaction notification email:', error);
      throw error;
    }
  }

  // Send stop loss/trailing stop triggered notification
  async sendStopLossNotification(userEmail, username, transaction, currentPrice, triggerType) {
    try {
      const { coin_symbol, quantity, price_at_transaction, stop_limit, trailing_stop_pct } = transaction;
      
      const subject = `Stop Loss Triggered: ${coin_symbol} sold at $${currentPrice}`;
      
      const profitLoss = (currentPrice - price_at_transaction) * quantity;
      const profitLossText = profitLoss >= 0 ? `Profit: $${profitLoss.toFixed(2)}` : `Loss: $${Math.abs(profitLoss).toFixed(2)}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; text-align: center;">Stop Loss Alert</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Automatic Sell Order Executed</h2>
            
            <p>Hello ${username},</p>
            
            <p>Your ${triggerType} has been triggered and your ${coin_symbol} has been automatically sold:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff6b6b;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Coin:</td>
                  <td style="padding: 8px 0; color: #333;">${coin_symbol}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Quantity Sold:</td>
                  <td style="padding: 8px 0; color: #333;">${quantity}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Original Price:</td>
                  <td style="padding: 8px 0; color: #333;">$${parseFloat(price_at_transaction).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Sell Price:</td>
                  <td style="padding: 8px 0; color: #333;">$${parseFloat(currentPrice).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Total Value:</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold;">$${(quantity * currentPrice).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">P&L:</td>
                  <td style="padding: 8px 0; color: ${profitLoss >= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">${profitLossText}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Trigger Type:</td>
                  <td style="padding: 8px 0; color: #333;">${triggerType}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Transaction ID: ${transaction.id}<br>
              Date: ${new Date().toLocaleString()}
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/transactions" 
                 style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Transactions
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              This is an automated message from Crypto Graphs.<br>
              Your stop loss protection worked as intended.
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cryptographs.com',
        to: userEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Stop loss notification email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('Error sending stop loss notification email:', error);
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail, username) {
    try {
      const subject = 'Welcome to Crypto Graphs!';
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; text-align: center;">Welcome to Crypto Graphs!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${username}!</h2>
            
            <p>Welcome to Crypto Graphs, your advanced cryptocurrency trading platform with real-time analytics and automated trading features.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">What you can do:</h3>
              <ul style="color: #555;">
                <li>Track real-time prices for BTC, ETH, and XRP</li>
                <li>View historical price charts with multiple timeframes</li>
                <li>Analyze moving averages (1, 2, 5, 9, 15 days)</li>
                <li>Execute mock buy/sell transactions</li>
                <li>Set stop loss and trailing stop orders</li>
                <li>Monitor your portfolio performance</li>
                <li>Receive email notifications for transactions</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Get Started
              </a>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
              Thank you for choosing Crypto Graphs!<br>
              Happy trading!
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cryptographs.com',
        to: userEmail,
        subject: subject,
        html: htmlContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent:', result.messageId);
      return result;

    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService(); 