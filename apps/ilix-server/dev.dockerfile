# NB: This is not a production-grade Dockerfile.

####################################################################################################
## Builder
####################################################################################################
FROM messense/rust-musl-cross:x86_64-musl as chef
RUN cargo install cargo-chef
WORKDIR /ilix_server

FROM chef AS planner
# Copy source code
COPY . .
# Generate info for caching dependencies
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /ilix_server/recipe.json recipe.json
# Build the application & cache dependencies
RUN cargo chef cook --release --target x86_64-unknown-linux-musl --recipe-path recipe.json
# Copy source code from previous stage
COPY . .
# Build application
RUN cargo build --release --target x86_64-unknown-linux-musl

####################################################################################################
## Final image
####################################################################################################
FROM scratch
WORKDIR /ilix_server

# Copy our build
COPY --from=builder /ilix_server/target/x86_64-unknown-linux-musl/release/ilix_server ./

# Copy app required files & dirs
COPY --from=builder /ilix_server/tmp ./tmp
COPY --from=builder /ilix_server/Assets ./Assets
COPY --from=builder /ilix_server/.env ./.env

ENTRYPOINT ["/ilix_server/ilix_server"]
EXPOSE 3000