// This .d.ts file should NOT become a route
// It's here to test that type definition files are properly ignored

export interface TestType {
  id: string;
  name: string;
}
