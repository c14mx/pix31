# pix31

A CLI to add [pixelarticons](https://pixelarticons.com/) to your React and React Native projects.

**Dependencies**
* React web components are built with Tailwind and use `tailwindcss`, `tailwind-merge` and `tailwindcss-animate`
* React Native components are built with `react-native-svg`

## Getting started

Run the `init` to add an `pix31.json` config file and install dependencies.

```bash
npx pix31 init
```

## Commands

Use the `browse` command to open the [pixelarticons](https://pixelarticons.com/) website on your browser and browse the available icons. **Note:** Only the free icons are available to install using `pix31`!

```bash
npx pix31 browse
```

Use the `add` command to add icons to your project. Icon names use the same lowercase naming-convention as [pixelarticons](https://pixelarticons.com/):

```bash
npx pix31 add [pixelarticon-name]
```

If you type an icon name that doesn't exist, you'll see a suggested list of icons that most closely match your input.


## Feedback

If you have feedback or catch a bug open an issue!

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

This project uses SVG icons from [pixelarticons](https://pixelarticons.com/).
