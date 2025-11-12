import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';
import { PatronForm } from './pages/PatronForm';

// Create a custom theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#764ba2',
      dark: '#4c5bcd',
    },
    secondary: {
      main: '#f093fb',
      light: '#f5576c',
      dark: '#e0538a',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#8bc34a',
      dark: '#388e3c',
    },
    info: {
      main: '#2196f3',
      light: '#03a9f4',
      dark: '#1976d2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Global styles
const globalStyles = (
  <GlobalStyles
    styles={{
      body: {
        margin: 0,
        fontFamily: theme.typography.fontFamily,
        backgroundColor: theme.palette.background.default,
      },
      '*': {
        boxSizing: 'border-box',
      },
    }}
  />
);

function App() {
  // Demo patron ID for testing
  const demoPatronId = 12345;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <div className="App">
        <PatronForm patronId={demoPatronId} />
      </div>
    </ThemeProvider>
  );
}

export default App;
