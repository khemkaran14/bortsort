/**
 * Public page where a player can delete their account from the web (Google Play requires a web
 * link for account deletion, as well as the in-app button). It uses the same one-time code login.
 */
export const DELETE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Delete your Bolt Sort account</title>
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1d2b3a;--dim:#5d6d7e;--line:#dde3ea}
@media (prefers-color-scheme:dark){:root{--bg:#10171f;--card:#1a2430;--ink:#e8eef5;--dim:#9fb0c2;--line:#2b3846}}
body{margin:0;font:16px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:480px;margin:0 auto;padding:24px 16px}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px}
input,select{font:inherit;padding:9px;border:1px solid var(--line);border-radius:8px;width:100%;box-sizing:border-box;background:var(--bg);color:var(--ink)}
button{font:inherit;padding:10px 16px;border:0;border-radius:8px;background:#e8554e;color:#fff;cursor:pointer;margin-top:12px}
.dim{color:var(--dim)}label{display:block;margin:12px 0 4px}#msg{margin-top:12px;font-weight:600}
</style></head><body><main>
<h1>Delete your account</h1>
<p class="dim">This deletes your Bolt Sort / Wit Twist account, its subscription and the progress saved on our server.
Progress stored only on your phone stays there until you remove the app.</p>
<div class="card">
<label for="ch">I log in with</label><select id="ch"><option value="phone">Phone number</option><option value="email">Email</option></select>
<label for="dest">Phone (with country code, e.g. +919876543210) or email</label><input id="dest" autocomplete="username">
<button id="send" type="button">Send code</button>
<div id="step2" hidden><label for="code">6-digit code</label><input id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
<button id="del" type="button">Delete my account</button></div>
<p id="msg" role="status"></p></div></main>
<script>
const $=(id)=>document.getElementById(id);const msg=(t)=>$('msg').textContent=t;
const body=()=>{const c=$('ch').value;return {channel:c,[c]:$('dest').value.trim()}};
const post=(p,b)=>fetch(p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(async r=>({ok:r.ok,data:await r.json().catch(()=>({}))}));
$('send').onclick=async()=>{const r=await post('/api/auth/otp',body());if(r.ok){$('step2').hidden=false;msg('Code sent.')}else msg('Could not send a code ('+(r.data.error||'error')+').')};
$('del').onclick=async()=>{const r=await post('/api/auth/verify',{...body(),code:$('code').value.trim()});
if(!r.ok){msg('Wrong or expired code.');return}
const d=await fetch('/api/me',{method:'DELETE',headers:{authorization:'Bearer '+r.data.token}});
msg(d.ok?'Your account has been deleted.':'Something went wrong. Please try again.')};
</script></body></html>`;
