// API route without +api.tsx suffix, inheriting from folder
export default (request: Request): Response => {
  return Response.json({
    message: 'Users API from folder inheritance',
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  })
}
