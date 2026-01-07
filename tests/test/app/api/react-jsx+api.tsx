export default async (request: Request) => {
  const { searchParams } = new URL(request.url);

  return (
    <h1
      style={{
        color: "#000",
        fontWeight: 900,
        fontSize: 96,
        marginBottom: -10,
      }}
    >
      {searchParams.get("title") || "no title"}
    </h1>
  );
};
