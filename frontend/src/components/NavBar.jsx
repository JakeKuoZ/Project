import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Button, IconButton, Box, useMediaQuery } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';

const NavBar = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    checkAuth();
    
    window.addEventListener('auth-change', checkAuth);
    
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2, display: { xs: 'block', sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Button 
            color="inherit" 
            component={Link} 
            to="/" 
            sx={{ 
              mr: 2,
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Home
          </Button>
          
          <Box sx={{ 
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 1
          }}>
            <Button color="inherit" component={Link} to="/articles">
              Articles
            </Button>
            {isLoggedIn && (
    <>
      <Button color="inherit" component={Link} to="/articles/create">
        Create Article
      </Button>
      <Button color="inherit" component={Link} to="/tickets">
        Tickets
      </Button>
    </>
  )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isLoggedIn ? (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                to="/register"
                sx={{ 
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white'
                  }
                }}
              >
                Register
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/profile">
                Profile
              </Button>
              <Button 
                color="inherit"
                onClick={handleLogout}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Logout
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar; 