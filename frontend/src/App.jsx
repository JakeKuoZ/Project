// Example frontend routes in React.js structured to match the backend routes

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ArticleList from './pages/ArticleList';
import CreateArticle from './pages/CreateArticle';
import ArticleDetail from './pages/ArticleDetail';
import { Box, Typography } from '@mui/material';
// import ArticleDetail from './pages/ArticleDetail';
// import ArticleForm from './pages/ArticleForm';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import TicketCreate from './pages/TicketCreate';
import PendingAssignments from './pages/PendingAssignments';
// import Chat from './pages/Chat';
// import SOPAnalysis from './pages/SOPAnalysis';
// import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import ChatWidget from './components/ChatWidget';


const App = () => {
  // Load user from localStorage at the top-level
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  return (
    <Router>
      <div className="app-container">
        <NavBar />
        <ChatWidget/>
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/articles" element={<ArticleList />} />
            <Route path="/articles/create" element={<CreateArticle />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />

            {/*
              For tickets, we pass isAdmin={user?.role === 'admin'}
              so the TicketList and TicketDetail can adapt accordingly.
            */}
            <Route
              path="/tickets"
              element={<TicketList isAdmin={user?.role === 'admin'} />}
            />
            <Route path="/tickets/create" element={<TicketCreate />} />
            <Route
              path="/tickets/:id"
              element={<TicketDetail isAdmin={user?.role === 'admin'} />}
            />

            <Route path="/pending-assignments" element={<PendingAssignments />} />
            <Route path="*" element={<div style={{ padding: '2rem' }}>404 Not Found</div>} />
          </Routes>
        </Box>
      </div>
    </Router>
  );
};

export default App;


// const App = () => {
//   return (
//     <div>
//       <h1>Hello World</h1>
//     </div>
//   );
// };


