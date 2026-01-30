import { sessionManager } from '../background/report'; 

export async function renderReport(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stats = await sessionManager.getWeeklyStats();
  
  container.innerHTML = `
    <div style="border-top:1px solid #333; padding-top:12px; margin-top:12px;">
      <h3 style="margin:0 0 8px 0; font-size:14px; color:#aaa;">Weekly Activity</h3>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px;">
         <div style="background:#222; padding:8px; borderRadius:4px;">
           <div style="color:#666; font-size:11px;">Time</div>
           <div style="font-weight:bold; font-size:16px;">${stats.totalMinutes}m</div>
         </div>
         <div style="background:#222; padding:8px; borderRadius:4px;">
           <div style="color:#666; font-size:11px;">Sessions</div>
           <div style="font-weight:bold; font-size:16px;">${stats.sessionCount}</div>
         </div>
         <div style="background:#222; padding:8px; borderRadius:4px;">
           <div style="color:#666; font-size:11px;">Top Mood</div>
           <div style="font-weight:bold; text-transform:capitalize;">${stats.topMode}</div>
         </div>
         <div style="background:#222; padding:8px; borderRadius:4px;">
           <div style="color:#666; font-size:11px;">Auto-Stops</div>
           <div style="font-weight:bold;">${stats.autoStopCount}</div>
         </div>
      </div>
    </div>
  `;
}
