import React, { useState } from "react";
import { Typography, Button } from "@mui/material";
import "./ChatBox.css"; // Import our new separate CSS file!

function ChatBox({ messages, me, onSendMessage }) {
  const [currentText, setCurrentText] = useState("");

  const handleSend = () => {
    if (currentText.trim() === "") return;
    onSendMessage(currentText);
    setCurrentText(""); // Clear the input box after sending
  };

  return (
    <div className="chat-container">
      <Typography variant="h6" gutterBottom>
        Meeting Chat
      </Typography>

      {/* Chat History Box */}
      <div className="chat-history">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === me;

          return (
            <div
              key={index}
              className={`chat-message-row ${isMe ? "me" : "them"}`}
            >
              <Typography variant="caption" color="textSecondary">
                {isMe ? "You" : (msg.senderName || msg.senderId.substring(0, 5))}
              </Typography>
              <br />

              <div className={`chat-bubble ${isMe ? "me" : "them"}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Input */}
      <div className="chat-input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="contained" onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  );
}

export default ChatBox;
