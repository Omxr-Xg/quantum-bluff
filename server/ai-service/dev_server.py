from __future__ import annotations

import uvicorn


def main() -> None:
    try:
        uvicorn.run("main:app", host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
