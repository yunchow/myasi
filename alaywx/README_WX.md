# ALayer WeChat Mini Program (ALayerWX)

This is the WeChat Mini Program version of the ALayer app.

## How to Run & Test

1.  **Install WeChat Developer Tools**
    -   Download from [WeChat Developers Website](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).

2.  **Import Project**
    -   Open WeChat Developer Tools.
    -   Click **Import Project** (导入项目).
    -   Select the root folder: `/Users/bytedance/projects/alaywx` (or specifically the `miniprogram` folder if preferred, but root is recommended as `project.config.json` is there).
    -   **AppID**: Use your own AppID (Register at [mp.weixin.qq.com](https://mp.weixin.qq.com/)). Cloud Development requires a real AppID, "Test Account" (测试号) might not support all cloud features.

3.  **Setup Cloud Environment**
    -   In Developer Tools, click the **Cloud Base** (云开发) button on the toolbar.
    -   Create a new environment if you don't have one.
    -   Copy your **Environment ID**.
    -   Open `miniprogram/app.js` and update the `env` property in `wx.cloud.init`:
        ```javascript
        wx.cloud.init({
          env: 'your-env-id', // Replace with your Environment ID
          traceUser: true,
        })
        ```

4.  **Deploy Cloud Functions**
    -   In the project file tree, find the `cloudfunctions` folder.
    -   **Right-click on `login` folder** -> Select **Upload and Deploy: Cloud-side install dependencies** (上传并部署：云端安装依赖).
    -   **Right-click on `fetchPrice` folder** -> Select **Upload and Deploy: Cloud-side install dependencies**.
    -   Wait for the deployment success messages.

5.  **Database Initialization**
    -   The app is designed to automatically create collections when you add data, but for better stability, you can manually create these collections in the Cloud Console > Database:
        -   `layers`
        -   `assets`
        -   `positions`
        -   `transactions` (New)
        -   `signals` (New)
        -   `messages`
        -   `categories`
        -   `settings`

6.  **Network Configuration**
    -   The app now uses Cloud Functions (`fetchPrice`) to fetch stock prices, so you do **not** need to configure request domains for `stooq.com`.
    -   Ensure your Cloud Functions have internet access (default is enabled).

## Features

-   **Layers**: Manage investment layers. Create new layers via the top "+" button.
-   **Assets**: Add/Edit assets (Stock, Fund, etc.).
-   **Transactions**: Record Buy/Sell/Dividend transactions in the Asset Edit page.
-   **Signals**: Set Price/PnL alerts in the Asset Edit page.
-   **Details**: Aggregated view of assets.
-   **Messages**: Notifications (System placeholders).
-   **My**: User profile and management tools.

## Troubleshooting

-   **Cloud Function Error**: Ensure you deployed BOTH `login` and `fetchPrice` functions.
-   **Database Error**: Ensure collections exist and permissions are set (default is usually "Creator read/write").
-   **Price Fetch Error**: Check Cloud Function logs in WeChat Developer Tools for `fetchPrice`.
