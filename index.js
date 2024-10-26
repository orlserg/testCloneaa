import { Client } from '@replit/crosis';

const client = new Client<{ user: { name: string }; repl: { id: string } }>();

const repl = { id: 'someuuid' };

async function fetchConnectionMetadata(
  signal: AbortSignal,
): Promise<FetchConnectionMetadataResult> {
  let res: Response;
  try {
    res = await fetch(CONNECTION_METADATA_URL + repl.id, { signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        error: FetchConnectionMetadataError.Aborted,
      };
    }

    throw error;
  }

  if (!res.ok) {
    if (res.status > 500) {
      // Network or server error, try again
      return {
        error: FetchConnectionMetadataError.Retriable,
      };
    }

    const errorText = await res.text();
    throw new Error(errorText || res.statusText);
  }

  const connectionMetadata = await res.json();

  return {
    token: connectionMetadata.token,
    gurl: connectionMetadata.gurl,
    conmanURL: connectionMetadata.conmanURL,
    error: null,
  };
}

const user = { name: 'tim' };

const context = { user, repl };

client.open({ context, fetchConnectionMetadata }, function onOpen({ channel, context }) {
  //  The client is now connected (or reconnected in the event that it encountered an unexpected disconnect)
  // `channel` here is channel0 (more info at https://crosis-doc.util.repl.co/protov2)
  // - send commands using `channel.send`
  // - listen for commands using `channel.onCommand(cmd => ...)`

  return function cleanup({ willReconnect }) {
    // The client was closed and might reconnect if it was closed unexpectedly
  };
});

// See docs for exec service here https://crosis-doc.util.repl.co/services#exec
const closeChannel = client.openChannel({ service: 'exec' }, function open({ channel, context }) {
  channel.onCommand((cmd) => {
    if (cmd.output) {
      terminal.write(cmd.output);
    }
  });

  const intervalId = setInterval(() => {
    channel.send({
      exec: { args: ['echo', 'hello', context.user.name] },
      blocking: true,
    });
  }, 100);

  return function cleanup({ willReconnect }) {
    clearInterval(intervalId);
  };
});
