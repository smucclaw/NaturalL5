# Using Docker to build and run on port 8000

```bash
docker build -t web .
docker run -p 8000:5000 web
```

To run with npm, look into the `web` folder's `README.md`

# Disclaimer

This is a prototype. This lacks proper documentation and the code quality isn't ideal, due to a lack of time.
This is structured like this because the folders the `web` folder depends on the `web-runtime-prototype` for code. Ideally, the code will be pushed to npm and tracked.
