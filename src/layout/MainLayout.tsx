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
      <Box flex={1} display="flex" flexDirection="column">
        {children}
      </Box>

      {/* Language selector ở bottom center */}
      {/*<Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        py={3}
        bgcolor="#f8f8f8"
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
            minWidth: 120,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#e0e0e0",
              borderRadius: 2
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#274549"
            }
          }}
        >
          <MenuItem value="vi">
            <Box display="flex" alignItems="center" gap={1}>
              <img src="/images/vn.png" width={18} height={14} alt="VN" />
              <Typography>Tiếng Việt</Typography>
            </Box>
          </MenuItem>
          <MenuItem value="en">
            <Box display="flex" alignItems="center" gap={1}>
              <img src="/images/us.png" width={18} height={14} alt="EN" />
              <Typography>English</Typography>
            </Box>
          </MenuItem>
        </Select>
      </Box> */}
    </Box>
  );
}