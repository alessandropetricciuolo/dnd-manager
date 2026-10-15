/** One-off, revision-safe recovery from existing PDF AcroForm values. Dry run is the default. */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve,basename} from "node:path";
import {isDeepStrictEqual} from "node:util";
import {loadEnvConfig} from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {recoverCharacterSheetFromPdfFields} from "../src/lib/character-sheets/recover-pdf-sheet";
import {isCharacterSheetV1,mergeCharacterSheetIntoSnapshot} from "../src/lib/character-sheet";

async function main(){
 loadEnvConfig(process.cwd());
 const input=process.argv.find(a=>a.startsWith("--input="))?.slice(8);if(!input)throw Error("Provide --input=<collected.json>; default is dry run, --apply persists additive recovered data");
 const rows=JSON.parse(readFileSync(resolve(input),"utf8")) as Array<any>;
 const baselineArg=process.argv.find(a=>a.startsWith("--baseline="))?.slice(11);const baseline=new Map<string,any>(baselineArg?JSON.parse(readFileSync(resolve(baselineArg),"utf8")).map((r:any)=>[r.id,r]):[]);
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
 const {data:current,error}=await client.from("campaign_characters").select("id,name,rules_snapshot,updated_at,sheet_file_path,level");if(error)throw error;
 const currentById=new Map(current.map(r=>[r.id,r]));const report=[];const apply=process.argv.includes("--apply");
 for(const source of rows){const row=currentById.get(source.id);const result:any={id:source.id,name:source.name};report.push(result);
 if(!row){result.status="missing_character";continue;}const expected=baseline.get(row.id);const refresh=Boolean(expected && expected.updated_at===row.updated_at && isDeepStrictEqual(expected.rules_snapshot?.character_sheet,row.rules_snapshot?.character_sheet) && row.rules_snapshot?.character_sheet?.source==="recovered" && row.rules_snapshot.character_sheet.recovery?.sha256===source.sha256);if(row.rules_snapshot?.character_sheet&&!refresh){result.status="already_structured";continue;}
 if(!source.fields){result.status=source.error??"no_fields";continue;}
 if((!refresh&&row.updated_at!==source.revision) || row.sheet_file_path!==source.path){result.status="revision_conflict";continue;}
 const sheet=recoverCharacterSheetFromPdfFields(source.fields,{sourceFile:source.recoveredFromLocal?"archivio-locale/"+basename(source.recoveredFromLocal):source.path?.startsWith("http")?new URL(source.path).origin+new URL(source.path).pathname:source.path,sha256:source.sha256,recoveredAt:refresh?row.rules_snapshot.character_sheet.recovery.recoveredAt:new Date().toISOString()});
 if(!sheet){result.status="no_recoverable_fields";continue;}
 if(Array.isArray(row.rules_snapshot?.spellSlots)){const slots:any={};for(const slot of row.rules_snapshot.spellSlots){if(Number.isInteger(slot?.level)&&slot.level>=1&&slot.level<=9&&Number.isInteger(slot.count))slots[slot.level]=slot.count;}if(Object.keys(slots).length)sheet.spellSlots=slots;}
 const details=row.rules_snapshot?.spellsDetailsMd;if(details&&typeof details==="object"&&sheet.spells){const norm=(s:string)=>s.trim().toLocaleLowerCase("it");const texts=new Map(Object.entries(details).map(([k,v])=>[norm(k),v]));sheet.spells=sheet.spells.map(s=>({...s,...(typeof texts.get(norm(s.name))==="string"?{fullTextMd:texts.get(norm(s.name)) as string}:{})}));}
 if(!isCharacterSheetV1(sheet)){result.status="invalid_recovered_sheet";continue;}
 result.fields=Object.keys(sheet).filter(k=>!["source","version","recovery"].includes(k));result.pdfLevel=sheet.level;result.currentLevel=row.level;result.requiresReview=sheet.level!==undefined&&sheet.level!==row.level;result.completeAbilities=Object.keys(sheet.abilities??{}).length===6;
 const snapshot=mergeCharacterSheetIntoSnapshot(row.rules_snapshot,sheet);
 if(apply){const {data:saved,error:e}=await client.from("campaign_characters").update({rules_snapshot:snapshot}).eq("id",row.id).eq("updated_at",row.updated_at).select("id,rules_snapshot").maybeSingle();if(e){result.status="write_failed";result.error=e.message;}else if(!saved){result.status="revision_conflict";}else if(!isDeepStrictEqual(saved.rules_snapshot.character_sheet,sheet)){result.status="readback_mismatch";}else result.status="recovered";}else result.status="ready";
 }
 const output=resolve(input).replace(/collected\.json$/,"recovery-"+(apply?"applied":"plan")+".json");writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({mode:apply?"apply":"dry-run",counts:report.reduce((a:any,r:any)=>(a[r.status]=(a[r.status]??0)+1,a),{}),review:report.filter(r=>r.requiresReview).length,report:output}));
}
main().catch(e=>{console.error(e.message);process.exit(1)});
