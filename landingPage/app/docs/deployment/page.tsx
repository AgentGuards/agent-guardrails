import Prose from '../../components/docs/prose'
import CodeBlock from '../../components/docs/code-block'
import Callout from '../../components/docs/callout'

export default function DeploymentPage() {
  return (
    <Prose>
      <h1>Deployment Guide</h1>

      <p>
        End-to-end deployment from program to dashboard.
      </p>

      <h2>Deployment Sequence</h2>

      <ol>
        <li>Build and deploy the Solana program</li>
        <li>Create Neon Postgres database</li>
        <li>Deploy the Express server</li>
        <li>Configure Helius webhook</li>
        <li>Deploy the Next.js dashboard</li>
      </ol>

      <h2>1. Program Deployment</h2>

      <CodeBlock filename="terminal">
{`cd program
anchor build
anchor deploy --provider.cluster devnet`}
      </CodeBlock>

      <p>
        Note the program ID from the output. Update{' '}
        <code>GUARDRAILS_PROGRAM_ID</code> in <code>server/.env</code> and{' '}
        <code>dashboard/.env.local</code>.
      </p>

      <h2>2. Database Setup</h2>

      <p>
        Create a Neon Postgres project at{' '}
        <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">
          neon.tech
        </a>
        . Get both the pooled and direct connection strings.
      </p>

      <CodeBlock filename="server/.env">
{`DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require`}
      </CodeBlock>

      <p>Then run migrations:</p>

      <CodeBlock filename="terminal">
{`cd server && npx prisma migrate deploy`}
      </CodeBlock>

      <h2>3. Server Deployment</h2>

      <p>
        Configure the following environment variables on your hosting provider:
      </p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>PORT</code></td>
            <td>Yes</td>
            <td>Server port (default 8080)</td>
          </tr>
          <tr>
            <td><code>SOLANA_RPC_URL</code></td>
            <td>Yes</td>
            <td>Helius devnet RPC endpoint</td>
          </tr>
          <tr>
            <td><code>GUARDRAILS_PROGRAM_ID</code></td>
            <td>Yes</td>
            <td>Program ID from step 1</td>
          </tr>
          <tr>
            <td><code>DATABASE_URL</code></td>
            <td>Yes</td>
            <td>Neon pooled connection string</td>
          </tr>
          <tr>
            <td><code>DIRECT_URL</code></td>
            <td>Yes</td>
            <td>Neon direct connection string</td>
          </tr>
          <tr>
            <td><code>JWT_SECRET</code></td>
            <td>Yes</td>
            <td>Random string, 32+ characters</td>
          </tr>
          <tr>
            <td><code>CORS_ORIGIN</code></td>
            <td>Yes</td>
            <td>Dashboard URL for CORS headers</td>
          </tr>
          <tr>
            <td><code>MONITOR_KEYPAIR</code></td>
            <td>Yes</td>
            <td>Base64-encoded monitor keypair</td>
          </tr>
          <tr>
            <td><code>HELIUS_WEBHOOK_SECRET</code></td>
            <td>Yes</td>
            <td>HMAC secret for webhook verification</td>
          </tr>
          <tr>
            <td><code>ANTHROPIC_API_KEY</code></td>
            <td>Optional</td>
            <td>Required for AI judge verdicts</td>
          </tr>
          <tr>
            <td><code>POLL_INTERVAL_MS</code></td>
            <td>Optional</td>
            <td>Polling interval (default 30000)</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock filename="terminal">
{`cd server
pnpm install
pnpm build
pnpm start`}
      </CodeBlock>

      <h2>4. Helius Webhook</h2>

      <p>
        Configure a Helius webhook to point to your server for real-time
        transaction monitoring:
      </p>

      <ul>
        <li>
          <strong>URL:</strong>{' '}
          <code>https://your-server.com/webhook</code>
        </li>
        <li>
          <strong>Transaction type:</strong> Enhanced
        </li>
        <li>
          <strong>Account addresses:</strong> your program ID
        </li>
        <li>
          <strong>Webhook type:</strong> enhanced
        </li>
        <li>
          Set the HMAC secret to match your{' '}
          <code>HELIUS_WEBHOOK_SECRET</code> environment variable
        </li>
      </ul>

      <h2>5. Dashboard Deployment</h2>

      <p>
        Deploy the Next.js dashboard to Vercel with the following environment
        variables:
      </p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>NEXT_PUBLIC_SOLANA_RPC_URL</code></td>
            <td>Helius devnet RPC endpoint</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_GUARDRAILS_PROGRAM_ID</code></td>
            <td>Program ID from step 1</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_API_URL</code></td>
            <td>Server URL from step 3</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock filename="terminal">
{`cd dashboard
npm install
npm run build`}
      </CodeBlock>

      <h2>Verification Checklist</h2>

      <ol>
        <li>
          <strong>Server health:</strong>{' '}
          <code>curl https://your-server.com/api/session</code> returns 401
          (auth required means the server is running)
        </li>
        <li>
          <strong>Webhook:</strong> check server logs for{' '}
          <code>[webhook] received</code> messages
        </li>
        <li>
          <strong>Dashboard:</strong> navigate to the deployed URL, connect
          your wallet, and verify policies load
        </li>
        <li>
          <strong>End-to-end:</strong> run the demo setup and simulate an
          attack:
        </li>
      </ol>

      <CodeBlock filename="terminal">
{`cd dashboard
npm run demo:setup
npm run demo:simulate`}
      </CodeBlock>

      <Callout type="warning">
        Never commit .env files or API keys. Use your hosting provider&#39;s
        secret management.
      </Callout>
    </Prose>
  )
}
