import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Make sure this import path is correct

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth(); // Now properly using the hook
  
  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;