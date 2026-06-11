# Anonymous Bot

## Storage

The bot stores JSON database files in `BOT_DATA_DIR` and downloaded media files in `BOT_MEDIA_DIR`.

Local defaults:

```env
BOT_DATA_DIR=./data
BOT_MEDIA_DIR=./media
```

Railway requires a persistent Volume. Mount the Volume to `/data` and set:

```env
BOT_DATA_DIR=/data
BOT_MEDIA_DIR=/data/media
```

On startup the bot creates all required folders automatically:

- `photos`
- `videos`
- `voices`
- `documents`
- `stickers`
- `temp`

If old files exist in local `./data` or `./media`, the bot copies missing files into the configured storage directories without overwriting existing data.
