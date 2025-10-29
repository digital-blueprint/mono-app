# Use `just <recipe>` to run a recipe
# https://just.systems/man/en/

import ".shared/common.just"
import ".shared/dbp-app.just"

# By default, run the `--list` command
default:
    @just --list

# Variables

zellijSession := "mono-app"

# Open a browser with the processpayment page
[group('dev')]
open-processpayment:
    xdg-open https://127.0.0.1:8001/dist/de/mono-processpayment
