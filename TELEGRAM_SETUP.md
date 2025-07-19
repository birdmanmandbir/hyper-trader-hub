# Telegram Notifications Setup for GitHub Actions

This guide will help you set up Telegram notifications for your GitHub Actions workflows.

## Prerequisites
- A Telegram account
- Access to your GitHub repository settings

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a conversation and send `/newbot`
3. Follow the prompts:
   - Choose a name for your bot (e.g., "My GitHub Actions Bot")
   - Choose a username for your bot (must end with "bot", e.g., "mygithubactions_bot")
4. **Save the bot token** that BotFather gives you. It looks like:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456789
   ```

## Step 2: Get Your Chat ID

1. Start a chat with your new bot (search for it by username)
2. Send any message to the bot (e.g., "Hello")
3. Open this URL in your browser (replace `YOUR_BOT_TOKEN` with your actual token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. Look for the `"chat"` object in the JSON response and find your `"id"`. It will be a number like:
   ```json
   "chat": {
     "id": 123456789,
     "first_name": "Your Name",
     ...
   }
   ```
5. **Save this chat ID** - you'll need it for the next step

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Your bot token from Step 1
4. Add another secret:
   - **Name**: `TELEGRAM_CHAT_ID`
   - **Value**: Your chat ID from Step 2

## Step 4: Test Your Setup

1. Push a commit to the `main` branch or create a pull request
2. Check your Telegram - you should receive a notification!

## Notification Types

### Main Branch Deployments
You'll receive notifications when:
- ✅ Deployment succeeds
- ❌ Deployment fails

The notification includes:
- Repository name
- Branch name
- Commit details
- Direct link to your deployed site

### Pull Request Previews
You'll receive notifications for:
- New PR preview deployments
- Updates to existing PRs

The notification includes:
- PR number and title
- Author information
- Preview URL
- Link to the PR on GitHub

## Troubleshooting

### Not receiving notifications?
1. Make sure you've started a conversation with your bot
2. Verify your bot token and chat ID are correct
3. Check the GitHub Actions logs for any errors

### Getting "Forbidden" errors?
- Your chat ID might be incorrect
- Try sending another message to your bot and getting a fresh chat ID

### Want to customize the messages?
Edit the `message` field in the workflow files:
- `.github/workflows/deploy.yml` for main deployments
- `.github/workflows/deploy-preview.yml` for PR previews

## Security Note
Never commit your bot token or chat ID directly to your repository. Always use GitHub Secrets!