// src/layouts/MainLayout.tsx
import { Box, MenuItem, Select, Typography, IconButton, Divider } from "@mui/material";
import { ArrowBack, Home } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import NetworkAlert from "../components/NetworkAlert";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

interface MainLayoutProps {
  children: React.ReactNode;
  onHome?: () => void;
  onBack?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export default function MainLayout({
  children,
  onHome,
  onBack,
  showHomeButton = false,
  showBackButton = false
}: MainLayoutProps) {
  const { i18n } = useTranslation();
  const { t } = useTranslation();
  const currentLang = i18n.language;
  const { isOnline, isConnected, connectionType } = useNetworkStatus();

  const handleChangeLang = (event: any) => {
    const lang = event.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  // const flagSrc = (lang: string) =>
  //   lang === "vi" ? "vn.png" : "us.png";

  return (
    <Box
      minHeight="100vh"
      bgcolor="#f8f8f8"
      display="flex"
      flexDirection="column"
    >
      {/* Network Status Alert */}
      <NetworkAlert
        isOnline={isOnline}
        isConnected={isConnected}
        connectionType={connectionType}
      />

      {/* Header */}
      <Box
        bgcolor="#274549"
        color="#fff"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={2}
        py={2}
        minHeight={70}
        position="sticky"
        top={0}
        zIndex={1000}
      >
        {/* Logo */}
        <img src="/images/TheGrandHoTram.png" alt="Logo" style={{ height: 55 }} />
      </Box>

      {/* Navigation Buttons - Outside header, between header and content */}
      {(showBackButton || showHomeButton) && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          px={2}
          py={1}
          bgcolor="#f8f8f8"
        >
          {/* Back Button */}
          {showBackButton && onBack ? (
            <IconButton
              onClick={onBack}
              size="small"
              sx={{
                color: '#274549',
                border: '1px solid #274549',
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "rgba(35, 64, 67, 0.1)"
                }
              }}
            >
              <ArrowBack fontSize="small" />
            </IconButton>
          ) : (
            <Box width={32} height={32} /> // Empty space to maintain layout
          )}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1}
            bgcolor="#f8f8f8"
          >
            <Typography variant="h5" color="#274549" fontWeight="bold">
              {t("QueueTicketHeader")}
              <Divider sx={{ my: 1.5, borderBottomWidth: 1, borderColor: "#274549" }} />
            </Typography>
          </Box>
          {/* Home Button */}
          {showHomeButton && onHome ? (
            <IconButton
              onClick={onHome}
              size="small"
              sx={{
                color: '#274549',
                border: '1px solid #274549',
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "rgba(35, 64, 67, 0.1)"
                }
              }}
            >
              <Home fontSize="small" />
            </IconButton>
          ) : (
            <Box width={32} height={32} /> // Empty space to maintain layout
          )}
        </Box>
      )}

      {/* Content */}
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        sx={{ pb: '60px' }} // Add padding to avoid footer overlap
      >
        {children}
      </Box>

      {/* Fixed Footer with Language selector */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'white',
          borderTop: '1px solid #e0e0e0',
          py: 1.5,
          px: 2,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Select
          value={currentLang}
          onChange={handleChangeLang}
          variant="outlined"
          size="small"
          sx={{
            bgcolor: "#fff",
            color: "#274549",
            fontWeight: 600,
            minWidth: 150,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#274549",
              borderWidth: 1.5,
              borderRadius: 2
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1a3033",
              borderWidth: 2
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#274549",
              borderWidth: 2
            }
          }}
        >
          <MenuItem value="vi">
            <Box display="flex" alignItems="center" gap={1}>
              <img src="/images/vn.png" width={20} height={15} alt="VN" />
              <Typography fontWeight={500}>Tiếng Việt</Typography>
            </Box>
          </MenuItem>
          <MenuItem value="en">
            <Box display="flex" alignItems="center" gap={1}>
              <img src="/images/us.png" width={20} height={15} alt="EN" />
              <Typography fontWeight={500}>English</Typography>
            </Box>
          </MenuItem>
        </Select>
      </Box>
    </Box>
  );
}