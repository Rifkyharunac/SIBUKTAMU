import { requireAdminApi } from "@/lib/admin-auth";
export async function GET(){
 const auth=await requireAdminApi(["SUPER_ADMIN","ADMIN_BIDANG"]);if('error' in auth)return auth.error;
 return Response.json({id:'/admin/',name:'SIBUKTAMU',short_name:'SIBUKTAMU',prefer_related_applications:false,description:'Notifikasi dan pelayanan tamu Disnakertrans Sulawesi Tengah',lang:'id',start_url:'/admin/dashboard',scope:'/admin/',display:'standalone',background_color:'#f0f9ff',theme_color:'#0369a1',icons:[{src:'/sibuktamu-icon-192.png?v=3',sizes:'192x192',type:'image/png'},{src:'/sibuktamu-icon-512.png?v=3',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/sibuktamu-maskable-512.png?v=3',sizes:'512x512',type:'image/png',purpose:'maskable'}]},{headers:{'Content-Type':'application/manifest+json','Cache-Control':'private, no-store'}});
}
