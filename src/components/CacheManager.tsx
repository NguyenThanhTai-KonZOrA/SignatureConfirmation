import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import CacheBuster from '../utils/cacheBuster';

interface CacheManagerProps {
  showButton?: boolean;
}

const CacheManager: React.FC<CacheManagerProps> = ({ showButton = false }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Auto clear cache silently for end users - no notifications
    if (CacheBuster.shouldClearCache()) {
      // Silent cache clear for production users
      CacheBuster.clearAllCaches().then(() => {
        console.log('✅ Cache auto-cleared for new version');
        // Update version without showing notification
        localStorage.setItem('app_cache_version', CacheBuster.getCurrentVersion());
      });
    }
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await CacheBuster.clearAllCaches();
      setIsDialogOpen(false);
      // Force reload after clearing cache
      setTimeout(() => {
        CacheBuster.forceReload();
      }, 1000);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      {/* Clear Cache Button - only show for developers/admin */}
      {showButton && (
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setIsDialogOpen(true)}
          sx={{ ml: 1 }}
        >
          Clear Cache
        </Button>
      )}

      {/* Clear Cache Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogTitle>Clear Application Cache</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will clear all cached data and reload the application. 
            You may need to log in again.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Current version: {CacheBuster.getCurrentVersion()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Build time: {typeof __BUILD_TIME__ !== 'undefined' ? new Date(__BUILD_TIME__).toLocaleString() : 'Unknown'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleClearCache} 
            variant="contained" 
            disabled={isClearing}
          >
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CacheManager;
