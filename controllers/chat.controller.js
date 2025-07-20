const Chat = require('../models/Chat.model');
const User = require('../models/User.model');
const logger = require('../utils/logger');

// Save chat message to DB
exports.saveMessage = async (messageData) => {
  try {
    const message = await Chat.create({
      content: messageData.content,
      sender: messageData.senderId,
      recipient: messageData.recipientId || 'admin' // Default to admin
    });

    await message.populate('sender', 'name email role');
    return message;

  } catch (err) {
    logger.error(`Message save failed: ${err.message}`);
    throw err;
  }
};

// Get chat history
exports.getChatHistory = async (req, res) => {
  try {
    const messages = await Chat.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    })
    .sort('createdAt')
    .populate('sender', 'name email role');

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (err) {
    logger.error(`Chat history failed: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'Failed to load chat history'
    });
  }
};

// WebSocket message handler
exports.handleWebSocketMessage = async (ws, message) => {
  try {
    const parsedMsg = JSON.parse(message);
    
    // Validate message structure
    if (!parsedMsg.content || !parsedMsg.senderId) {
      throw new Error('Invalid message format');
    }

    const savedMessage = await this.saveMessage(parsedMsg);
    const populatedMsg = await Chat.populate(savedMessage, {
      path: 'sender',
      select: 'name email role'
    });

    // Broadcast to recipient(s)
    const recipientId = parsedMsg.recipientId || 'admin';
    const clients = ws.getClients(); // Implement this in your WS server
    
    clients.forEach(client => {
      if (client.userId === recipientId || client.userId === parsedMsg.senderId) {
        client.send(JSON.stringify(populatedMsg));
      }
    });

  } catch (err) {
    logger.error(`WS message handling failed: ${err.message}`);
    ws.send(JSON.stringify({ 
      error: true,
      message: 'Failed to process message'
    }));
  }
};