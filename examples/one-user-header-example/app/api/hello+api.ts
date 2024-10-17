export function GET(req: Request) {
    return new Response("Hello World", {
        status: 302,
        headers: {
            Location: "http://example.com",
            "Set-Cookie": "hello=world",
        },
    });
}
