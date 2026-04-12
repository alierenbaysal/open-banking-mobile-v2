import { createTheme, MantineColorsTuple } from '@mantine/core';

const bankGreen: MantineColorsTuple = [
  '#f0f9ed',
  '#dff0d9',
  '#bee0b3',
  '#99cf89',
  '#79c065',
  '#5db44c',
  '#4D9134',
  '#3f7a2b',
  '#326323',
  '#264c1b',
];

export const theme = createTheme({
  primaryColor: 'bankGreen',
  colors: {
    bankGreen,
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
  },
});
