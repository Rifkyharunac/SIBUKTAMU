function retired(){return Response.json({error:"Fitur check-out telah dinonaktifkan."},{status:410,headers:{"Cache-Control":"no-store"}});}
export const GET=retired;
export const POST=retired;
