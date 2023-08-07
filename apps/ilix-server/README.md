# Ilix::server

#### ➡ Server side API for ilix

## Purpose

1. Make an api with rust (my first)
2. Have fun (this comes out of the box with rust, so no worries)

## Made with:

1. **Elegance** ✅
2. `RUST` ✨🦀
3. [actix-web](https://actix.rs/) ♥ (web server backend frameword, _loved their DX_)
4. Mongodb 🗃 (simple database with an awesome free-tier)\
5. go see [Cargo.toml](./Cargo.toml)

## Installation

> Before running the api, you must create a `.env` file at the root of this project with the following variables:

```bash
APP_MODE="dev"
PORT=3000
MONGODB_URI="mongodb+srv://<username>:<password>@<username>.tmm5j.mongodb.net/?retryWrites=true&w=majority"
HASH_ROUND=5 # you're free to change it
SALT="a secret key"

```

### docker (recommended)

If you have docker installed on your system, start the deamon (or the desktop app) and simply run:

```bash
make docker_start # if you have 'make' installed on you machine
# or
docker build -f dev.dockerfile -t ilix-service .
docker run -d -p 3000:3000 ilix-service:latest
```

### source

Build from source with `cargo`

```bash
cargo build --release # will creates a single executable for your os in ./target/release, named "ilix_server" (with the associated executable extension in your os)
```
