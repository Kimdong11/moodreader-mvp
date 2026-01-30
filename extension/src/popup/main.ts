import { renderReport } from './report';
import { MessageType } from '../common/messages';

document.addEventListener('DOMContentLoaded', () => {
    // Basic Status
    chrome.runtime.sendMessage({ type: MessageType.GET_STATE }, (response) => {
        const el = document.getElementById('status');
        if (el && response?.state) {
            el.textContent = `State: ${response.state}`;
        }
    });

    // Render Report
    renderReport('report-container');
});
