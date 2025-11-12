// // src/components/Header.tsx
// import React from 'react';
// import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
// import HomeIcon from '@mui/icons-material/Home';
// import logo from '../../public/TheGrandHoTram.png'; 

// interface HeaderProps {
//   onHomeClick?: () => void;
// }

// const Header: React.FC<HeaderProps> = ({ onHomeClick }) => {
//   return (
//     <AppBar
//       position="static"
//       sx={{
//         backgroundColor: '#1E3A3A',
//         boxShadow: 'none',
//         paddingY: 1,
//       }}
//     >
//       <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
//         {/* Logo + Title */}
//         <Box sx={{ display: 'flex', alignItems: 'center' }}>
//           <img
//             src={logo}
//             alt="Logo"
//             style={{ height: 40, marginRight: 10 }}
//           />
//           <Box>
//             <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
//               The Grand
//             </Typography>
//             <Typography variant="caption" sx={{ opacity: 0.8 }}>
//               HO TRAM
//             </Typography>
//           </Box>
//         </Box>

//         {/* Home Button */}
//         <IconButton color="inherit" onClick={onHomeClick}>
//           <HomeIcon />
//         </IconButton>
//       </Toolbar>
//     </AppBar>
//   );
// };

// export default Header;
