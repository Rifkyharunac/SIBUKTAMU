import { requireAdminApi } from "@/lib/admin-auth";
export async function GET(){
 const auth=await requireAdminApi(["SUPER_ADMIN","ADMIN_BIDANG"]);if('error' in auth)return auth.error;
 return Response.json({id:'/admin/',name:'SIBUKTAMU Admin',short_name:'SIBUKTAMU',description:'Notifikasi dan pelayanan tamu Disnakertrans Sulawesi Tengah',lang:'id',start_url:'/admin/dashboard',scope:'/admin/',display:'standalone',background_color:'#f0f9ff',theme_color:'#0369a1',icons:[{src:'/sibuktamu-icon-192.png',sizes:'192x192',type:'image/png'},{src:'/sibuktamu-icon-512.png',sizes:'512x512',type:'image/png'}]},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'private, no-store'}});
}
