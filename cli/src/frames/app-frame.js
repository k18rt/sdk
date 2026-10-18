import { LitElement, html, css } from 'lit'
import '../app/sudoku-app.js'

export class AppFrame extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #fafaf8;
      box-sizing: border-box;
      overflow: hidden;
    }

    .frame-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--terracotta-100, #F7E7DE);
      border-bottom: 1px solid var(--terracotta-200, #EFB8A1);
      color: var(--terracotta-900, #5D2C28);
    }

    .frame-title {
      font-weight: 700;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .frame-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 16px;
    }
  `

  render() {
    return html`
      <div class="frame-header">
        <div class="frame-title">
          🧩 Application Sudoku
        </div>
      </div>
      <div class="frame-body">
        <sudoku-app></sudoku-app>
      </div>
    `
  }
}

customElements.define('app-frame', AppFrame)
