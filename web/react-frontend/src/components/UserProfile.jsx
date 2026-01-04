import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        {user.photoURL && (
          <img 
            src={user.photoURL} 
            alt={user.displayName || user.email} 
            className="user-avatar"
          />
        )}
        <div className="user-details">
          <div className="user-name">{user.displayName || 'User'}</div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>
      <button onClick={handleSignOut} className="sign-out-btn">
        Sign Out
      </button>
    </div>
  );
};

export default UserProfile;
