import React from 'react';
import { Button, Typography, Container, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Home() {
  // 'useNavigate' is the React Router tool that transports the user to a new page
  const navigate = useNavigate();

  const createMeeting = () => {
    // 1. Generate a massive, random string to use as our Room ID
    // crypto.randomUUID() is built directly into modern browsers!
    const newRoomId = crypto.randomUUID();
    
    // 2. Instantly transport the user to the Room Page, putting the ID in the URL
    navigate(`/room/${newRoomId}`);
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h2" gutterBottom>
        Zoom Clone
      </Typography>
      
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Click below to start a new instant meeting.
      </Typography>
      
      <Box sx={{ mt: 5 }}>
        {/* We attach our 'createMeeting' function to the onClick event of the button */}
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          onClick={createMeeting}
        >
          Create New Meeting
        </Button>
      </Box>
    </Container>
  );
}

export default Home;
