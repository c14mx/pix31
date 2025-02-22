# pix31

A CLI to add [pixelarticons](https://pixelarticons.com/) to your React and React Native projects.

**Dependencies**
* React web components are built with Tailwind and use `tailwindcss`, `tailwind-merge` and `tailwindcss-animate`
* React Native components are built with `react-native-svg`

## Getting started

Run the `init` command to select web or native and set a path to the new icons directory.

```bash
npx pix31 init
```

## Commands

Use the `add` command to add icons to your project. pix31 uses the same lower-case naming-convention as [pixelarticons](https://pixelarticons.com/):

```bash
npx pix31 add [pixelarticon-name]
```

If you type an icon name that doesn't exist, you'll see a suggested list of icons that most closely match your input.

Use the `browse` command to open the [pixelarticons](https://pixelarticons.com/) website on your browser.

```bash
npx pix31 browse
```

## Feedback

If you have feedback or catch a bug open an issue!

## Development

This project uses:
- TypeScript for type checking and linting
- Prettier for code formatting
- Jest for testing

