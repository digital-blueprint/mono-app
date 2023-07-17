FROM debian:bookworm

ENV LANG C.UTF-8
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get install -y \
    git \
    curl \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    nodejs \
    sudo \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -u 1000 -ms /bin/bash user
RUN echo 'user ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER user

WORKDIR "/application"

ENV ROLLUP_WATCH_HOST 0.0.0.0
ENV ROLLUP_WATCH_PORT 8001
