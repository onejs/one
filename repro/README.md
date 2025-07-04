### **Instructions for Using the One App to Reproduce Bugs**

1. **Fork the [One monorepo](https://github.com/onejs/one)**

   Start by forking the repository to your own GitHub account.

2. **Clone Your Fork**

   Clone your forked version of the One monorepo to your local machine:

```bash
git clone --depth 1 https://github.com/<your-username>/one.git
```

3. **Recreate the Bug in the `repro` Folder**

   Navigate to the `repro` folder and set up the environment:

   - Change directory:

```bash
cd repro
```

   - Install dependencies:

If your bug occurs with `bun`, `pnpm`, or `npm`, please use those instead.

```bash
yarn install
```

   - Run the app:

```bash
yarn dev
```

4. **Commit Your Changes** 

   Once you've recreated the bug in the `repro` folder, commit your changes to your fork:

```bash
git add .
git commit -m "repro: Describe the bug being reproduced"
git push origin <branch-name>
```

5. **Open an Issue**

   Go to the [One monorepo issues page](https://github.com/onejs/one/issues) and create a new issue:

   - Link to your fork (include the branch name if applicable) under the "Reproduction" section.

   - Provide detailed steps to reproduce the bug, along with any additional context.
