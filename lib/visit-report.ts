import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { reportLogo } from "./report-logo";
export type ReportRow = { visitCode:string; queueNumber:number; visitDate:string; visitorName:string; visitorType:string; institutionName:string|null; phone:string; checkInAt:string; checkOutAt:string|null; departmentName:string; serviceName:string; purpose:string|null; status:string };
export type ReportOptions = {from:string;to:string;scope:string;generatedAt:string;signerTitle:string;signerName:string;signerNip:string;address:string};
const OFFICE = "DINAS TENAGA KERJA DAN TRANSMIGRASI";
const PROVINCE = "PEMERINTAH PROVINSI SULAWESI TENGAH";
const CONTACT = "Pos-el: disnakertrans@sultengprov.go.id | Laman: disnakertrans.sultengprov.go.id";
const TITLE = "REKAPITULASI BUKU TAMU";
export function indonesiaDate(v:string) { return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Makassar",day:"2-digit",month:"long",year:"numeric"}).format(new Date(v+"T00:00:00+08:00")); }
function time(v:string|null) { return v ? new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Makassar",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v)).replace(".",":") : "-"; }
const labels = ["No.","Hari / tanggal · kode","Nama tamu","Instansi / asal","Nomor HP","Masuk / keluar (WITA)","Bidang / layanan","Maksud dan tujuan","Status"];
function cells(r:ReportRow,i:number) { return [String(i+1),new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Makassar",weekday:"long"}).format(new Date(r.visitDate+"T00:00:00+08:00"))+", "+indonesiaDate(r.visitDate)+"\n"+r.visitCode,r.visitorName,r.institutionName||r.visitorType,r.phone,time(r.checkInAt)+" / "+time(r.checkOutAt),r.departmentName+"\n"+r.serviceName,r.purpose||"-",r.status.replaceAll("_"," ")]; }
function safe(v:string) { return v.replace(/[\u2012-\u2015]/g,"-").replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7E\xA0-\xFF\n]/g," "); }
export function wrapText(text:string,font:PDFFont,size:number,width:number) {
  const lines:string[]=[];
  for (const para of safe(text).split("\n")) {
    let line="";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if (font.widthOfTextAtSize((line?line+" ":"")+word,size)<=width) { line+=(line?" ":"")+word; continue; }
      if(line) {lines.push(line);line="";}
      for (const char of word) { if(font.widthOfTextAtSize(line+char,size)>width && line) {lines.push(line);line="";} line+=char; }
    }
    if(line) lines.push(line);
  }
  return lines.length?lines:["-"];
}
export async function buildPdf(rows:ReportRow[],o:ReportOptions) {
  const doc=await PDFDocument.create(); doc.setTitle(TITLE);doc.setAuthor(OFFICE);doc.setCreator("SIBUKTAMU Disnakertrans");
  const regular=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),logo=await doc.embedPng(reportLogo);
  const size:[number,number]=[PageSizes.A4[1],PageSizes.A4[0]], margin=42.52;
  const widths=[25,99,90,83,73,64,137,113,72].map(n=>n*(size[0]-margin*2)/756);
  let page!:PDFPage,y=0;
  function center(text:string,y:number,font=regular,fontSize=10) { const t=safe(text);page.drawText(t,{x:(size[0]-font.widthOfTextAtSize(t,fontSize))/2,y,font,size:fontSize}); }
  function newPage(table=true) {
    page=doc.addPage(size);const top=size[1]-margin;
    page.drawImage(logo,{x:margin+4,y:top-62,width:40,height:62});
    center(PROVINCE,top-12,regular,12);center(OFFICE,top-32,bold,16);
    center(o.address,top-47,regular,8.5);center(CONTACT,top-60,regular,8);
    page.drawLine({start:{x:margin,y:top-70},end:{x:size[0]-margin,y:top-70},thickness:1.7});
    center(TITLE,top-92,bold,11);
    center("Periode "+indonesiaDate(o.from)+" s.d. "+indonesiaDate(o.to),top-107,regular,9);
    const scopeLines=wrapText("Lingkup: "+o.scope,regular,9,size[0]-2*margin);
    scopeLines.forEach((s,i)=>page.drawText(s,{x:margin,y:top-125-i*11,font:regular,size:9}));
    y=top-134-scopeLines.length*11;
    if(table) {const headers=labels.map((v,i)=>wrapText(v,bold,8.5,widths[i]-8));drawRow(headers,Math.max(...headers.map(v=>v.length))*11+8,true);}
  }
  function drawRow(wrapped:string[][],height:number,header=false,offset=0,take=999) {
    let x=margin;
    wrapped.forEach((lines,i)=>{
      page.drawRectangle({x,y:y-height,width:widths[i],height,borderColor:rgb(.3,.3,.3),borderWidth:.5,...(header?{color:rgb(.93,.94,.94)}:{})});
      lines.slice(offset,offset+take).forEach((line,j)=>page.drawText(line,{x:x+4,y:y-13-j*11,font:header?bold:regular,size:8.5}));x+=widths[i];
    });y-=height;
  }
  newPage();
  rows.forEach((r,i)=>{
    const wrapped=cells(r,i).map((v,c)=>wrapText(v,regular,8.5,widths[c]-8));
    const max=Math.max(...wrapped.map(l=>l.length));let offset=0;
    while(offset<max) {
      if(y-24<65)newPage();
      let take=Math.min(max-offset,Math.floor((y-65-8)/11));
      if(take<1){newPage();continue;}
      // Keep ordinary rows together; split only records taller than one printable page.
      if(offset===0 && take<max && max*11+8<260){newPage();take=Math.min(max,Math.floor((y-65-8)/11));}
      drawRow(wrapped,Math.max(24,take*11+8),false,offset,take);offset+=take;
    }
  });
  if(!rows.length){page.drawText("Tidak ada kunjungan dalam periode yang dipilih.",{x:margin+8,y:y-22,font:regular,size:10});y-=40;}
  if(y<195)newPage(false);
  y-=22;page.drawText(`Jumlah kunjungan: ${rows.length}`,{x:margin,y,font:bold,size:10});
  const sx=size[0]-margin-245;
  const signLines=["Palu, "+indonesiaDate(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())),o.signerTitle||"Pejabat yang mengesahkan"];
  let sy=y;for(const v of signLines)for(const line of wrapText(v,regular,10,245)){page.drawText(line,{x:sx,y:sy,font:regular,size:10});sy-=13;}
  sy-=35;page.drawText(safe(o.signerName||"(............................................................)"),{x:sx,y:sy,font:bold,size:10});
  page.drawText("NIP. "+safe(o.signerNip||"......................................................."),{x:sx,y:sy-14,font:regular,size:9});
  doc.getPages().forEach((p,i)=>{
    p.drawLine({start:{x:margin,y:42},end:{x:size[0]-margin,y:42},thickness:.4});
    p.drawText(safe("Dicetak: "+o.generatedAt+" | Untuk keperluan administrasi internal"),{x:margin,y:29,font:regular,size:7.5});
    const label=`Halaman ${i+1} dari ${doc.getPageCount()}`;p.drawText(label,{x:size[0]-margin-regular.widthOfTextAtSize(label,8),y:29,font:regular,size:8});
  });return doc.save();
}
export async function buildExcel(rows:ReportRow[],o:ReportOptions) {
  const wb=new ExcelJS.Workbook();wb.creator=OFFICE;wb.title=TITLE;wb.created=new Date();
  const ws=wb.addWorksheet("Buku Tamu",{views:[{state:"frozen",ySplit:10}],pageSetup:{paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.6,right:.6,top:.6,bottom:.6,header:.2,footer:.2},printTitlesRow:"1:10"}});
  ws.columns=[6,29,25,25,20,20,40,38,22].map(width=>({width}));
  const merged=(row:number,start:number,end:number,value:string,size=11,bold=false)=>{ws.mergeCells(row,start,row,end);const c=ws.getCell(row,start);c.value=value;c.font={name:"Arial",size,bold};c.alignment={horizontal:"center",vertical:"middle",wrapText:true};};
  merged(1,2,9,PROVINCE,12);merged(2,2,9,OFFICE,16,true);merged(3,2,9,o.address,10);merged(4,2,9,CONTACT,10);
  for(let r=1;r<=4;r++)ws.getRow(r).height=r===2?26:21;
  ws.addImage(wb.addImage({base64:reportLogo,extension:"png"}),{tl:{col:.25,row:.15},ext:{width:48,height:75},editAs:"absolute"});
  for(let c=1;c<=9;c++)ws.getCell(4,c).border={bottom:{style:"double"}};
  merged(6,1,9,TITLE,12,true);merged(7,1,9,"Periode "+indonesiaDate(o.from)+" s.d. "+indonesiaDate(o.to));merged(8,1,9,"Lingkup: "+o.scope);ws.getRow(8).height=30;
  ws.getRow(10).values=labels;ws.getRow(10).height=32;
  for(let r=10;r<=10+rows.length;r++){
    if(r>10)ws.getRow(r).values=cells(rows[r-11],r-11);
    const row=ws.getRow(r);row.height=r===10?32:Math.min(300,Math.max(48,...(r>10?cells(rows[r-11],r-11).map((v,i)=>Math.ceil(v.length/([6,29,25,25,20,20,40,38,22][i]*.8))*14):[32])));
    row.eachCell({includeEmpty:true},c=>{c.font={name:"Arial",size:11,bold:r===10};c.alignment={vertical:"middle",horizontal:r===10?"center":"left",wrapText:true};c.border={top:{style:"thin"},left:{style:"thin"},bottom:{style:"thin"},right:{style:"thin"}};if(r===10)c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFE8ECEB"}};c.numFmt="@";});
  }
  ws.autoFilter={from:"A10",to:`I${Math.max(10,10+rows.length)}`};
  const last=rows.length+12;merged(last,1,4,`Jumlah kunjungan: ${rows.length}`,11,true);merged(last,6,9,"Palu, ............................");merged(last+1,6,9,o.signerTitle||"Pejabat yang mengesahkan");ws.getRow(last+1).height=30;
  merged(last+4,6,9,o.signerName||"(............................................................)",11,true);merged(last+5,6,9,"NIP. "+(o.signerNip||"......................................................."));
  ws.pageSetup.printArea=`A1:I${last+6}`;ws.headerFooter.oddFooter="&LDicetak: "+o.generatedAt+"&RHalaman &P dari &N";
  const detail=wb.addWorksheet("Data Kunjungan");detail.addRow(["Kode","Nomor antrean","Tanggal","Nama","Asal","HP","Masuk","Keluar","Bidang","Layanan","Maksud","Status"]);
  rows.forEach(r=>detail.addRow([r.visitCode,r.queueNumber,r.visitDate,r.visitorName,r.institutionName||r.visitorType,r.phone,r.checkInAt,r.checkOutAt||"",r.departmentName,r.serviceName,r.purpose||"",r.status]));
  detail.columns.forEach(c=>{c.width=24;c.numFmt="@";});detail.getRow(1).font={name:"Arial",bold:true};detail.views=[{state:"frozen",ySplit:1}];detail.autoFilter=`A1:L${rows.length+1}`;
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
