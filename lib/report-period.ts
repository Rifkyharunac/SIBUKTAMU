export function validDate(value:string){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function validPeriod(from:string,to:string){return validDate(from)&&validDate(to)&&from<=to;}
export function shiftMonth(month:string,delta:number){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);}
export function monthRange(start:string,end:string){return {from:start+'-01',to:new Date(Date.parse(shiftMonth(end,1)+'-01T00:00:00Z')-86400000).toISOString().slice(0,10)};}
export function monthLabel(month:string){return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));}
