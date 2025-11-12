import React, { useState, useEffect } from 'react';
import { Alert, Box, Typography, Slide, IconButton } from '@mui/material';
import { WifiOff, Close } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface NetworkAlertProps {
  isOnline: boolean;
  isConnected: boolean;
  connectionType?: string;
}

const NetworkAlert: React.FC<NetworkAlertProps> = ({ 
  isOnline, 
  isConnected, 
  connectionType 
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide alert after 5 seconds if network is restored
  useEffect(() => {
    if (!isOnline || !isConnected) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // 5 giây

      return () => clearTimeout(timer);
    }
  }, [isOnline, isConnected]);

  // Reset visibility khi network status thay đổi
  useEffect(() => {
    if (!isOnline || !isConnected) {
      setIsVisible(true);
    }
  }, [isOnline, isConnected]);

  const handleClose = () => {
    setIsVisible(false);
  };

  if ((isOnline && isConnected) || !isVisible) {
    return null; // No alert needed when everything is fine or user closed it
  }

  const getAlertInfo = () => {
    if (!isOnline) {
      return {
        severity: 'error' as const,
        icon: <WifiOff />,
        title: t('NoInternetConnection') || 'Không có kết nối Internet',
        message: t('PleaseCheckConnection') || 'Vui lòng kiểm tra kết nối mạng của bạn và thử lại.'
      };
    }

    // if (!isConnected) {
    //   return {
    //     severity: 'warning' as const,
    //     icon: <SignalWifiOff />,
    //     title: t('WeakConnection') || 'Kết nối mạng yếu',
    //     message: t('SlowConnection') || 'Kết nối Internet của bạn có vẻ chậm hoặc không ổn định.'
    //   };
    // }

    return null;
  };

  const alertInfo = getAlertInfo();

  if (!alertInfo) return null;

  return (
    <Slide direction="down" in={isVisible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          p: 1,
        }}
      >
        <Alert
          severity={alertInfo.severity}
          sx={{
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: alertInfo.severity === 'error' ? '1px solid #f44336' : '1px solid #ff9800',
          }}
          icon={alertInfo.icon}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              {alertInfo.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {alertInfo.message}
            </Typography>
            {connectionType && (
              <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                {t('ConnectionType')}: {connectionType}
              </Typography>
            )}
          </Box>
        </Alert>
      </Box>
    </Slide>
  );
};

export default NetworkAlert;