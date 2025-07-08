// The code block below replicates the functionality provided by the following code:
//
// ```js
// import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
// <InitColorSchemeScript attribute="data-mui-color-scheme" />
// ```
//
// Where `data-mui-color-scheme` is the value we pass to `createTheme({cssVariables: { colorSchemeSelector: <value> })`
// in the component that calls `createTheme()`.
//
// We had to copy that output because `InitColorSchemeScript` is a React component generating a `<script>` tag and I
// couldn't find a way to let Vite render it in a cleaner way. The alternative would be to render the generated
// `<script>` tag in another element, then copy the content and append it to `<body>`, which is worse than this one
// IMHO, even if it implies that we have to keep it up-to-date manually. It's not a script that changes much anyway, so
// I think it's an acceptable trade-off.
//
// Reference: https://mui.com/material-ui/customization/css-theme-variables/configuration/#preventing-ssr-flickering
try {
  let colorScheme = '';
  const mode = localStorage.getItem('mui-mode') || 'system';
  const dark = localStorage.getItem('mui-color-scheme-dark') || 'dark';
  const light = localStorage.getItem('mui-color-scheme-light') || 'light';
  if (mode === 'system') {
    // handle system mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.matches) {
      colorScheme = dark
    } else {
      colorScheme = light
    }
  }
  if (mode === 'light') {
    colorScheme = light;
  }
  if (mode === 'dark') {
    colorScheme = dark;
  }
  if (colorScheme) {
    document.documentElement.setAttribute('data-mui-color-scheme', colorScheme);
  }
} catch (e) { }
