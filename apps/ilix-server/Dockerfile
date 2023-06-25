# NB: This is not a production-grade Dockerfile.

####################################################################################################
## Builder
####################################################################################################
FROM rust:latest AS builder

RUN rustup target add x86_64-unknown-linux-musl
RUN apt update && apt install -y musl-tools musl-dev
RUN update-ca-certificates

# Create appuser
ENV USER=ilix_server
ENV UID=10001

RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    "${USER}"

WORKDIR /ilix_server

COPY ./ .

RUN cargo build --target x86_64-unknown-linux-musl --release

####################################################################################################
## Final image
####################################################################################################
FROM alpine

# Import from builder.
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

WORKDIR /ilix_server

# Copy our build
COPY --from=builder /ilix_server/target/x86_64-unknown-linux-musl/release/ilix_server ./

# Copy app required files & dirs
COPY --from=builder /ilix_server/tmp ./tmp
COPY --from=builder /ilix_server/Assets ./Assets
COPY --from=builder /ilix_server/prod.env ./.env

# Use an unprivileged user. I don't use this user here because my app need a root access
# USER ilix_server:ilix_server

CMD ["/ilix_server/ilix_server"]