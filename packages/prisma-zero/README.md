# prisma-generator-zero

`prisma-generator-zero` is a generator for [prisma](https://www.prisma.io) that generates a [Zero](https://zero.rocicorp.dev/) schema from your Prisma schema. This includes schemas of models, enums, and relationships.

## Known issues and Limitations

> - The generator doesn't currently handle [permissions](https://zero.rocicorp.dev/docs/permissions), so the generated schema will default to allow any read/write operation. We'd love to add better support for this in the future and welcome contributions!

## Installation

```bash
npm install @passionfroot/prisma-generator-zero
```

## Usage

Add a new generator to your `prisma.schema`:

```prisma
generator zero {
  provider       = "prisma-generator-zero"
}
```

Then run the following command to generate the `schema.ts` file in the `./generated/zero` output folder:

```sh
npx prisma generate
```

You can directly use the generated schema as explained [here](https://zero.rocicorp.dev/docs/zero-schema#building-the-zero-schema) and/or reference specific exports anywhere else in your code.

If you want to customize the behavior of the generator you can use the following options:

```prisma
generator zero {
  // Specify output dir
  output   = "generated/one"
  // When true, the output will be formatted using prettier
  prettier = true
  // By default, the generator will keep track of changes to the schema and automatically bump the version.
  // You can opt-out from this behavior by setting `schemaVersion`.
  schemaVersion = 10
}
```
