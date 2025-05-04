{
  description = "mozeemotorsports.org dev environment";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };
  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
    }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import nixpkgs {
              inherit system;
              overlays = [ rust-overlay.overlays.default ];
            };
          }
        );
    in
    {
      devShells = forEachSupportedSystem (
        { pkgs }:
        {
          default = pkgs.mkShell {
            # buildInputs = with pkgs; [
            #   (rust-bin.stable.latest.default)
            # ];
            packages = with pkgs; [
              (rust-bin.stable.latest.default)
              rust-analyzer
            ];
            shellHook = ''
              echo "Welcome to mozeemotorsports.org development environment!"
            '';
          };
        }
      );
    };
}
