mod wiki;

use std::path::PathBuf;

use clap::Parser;

#[derive(Parser)]
#[command(name = "directory-renderer")]
#[command(about = "Renders files from input directory to output directory")]
#[command(version = "1.0")]
struct Args {
    #[arg(short, long, value_name = "INPUT_DIR")]
    input: PathBuf,

    #[arg(short, long, value_name = "OUTPUT_DIR")]
    output: PathBuf,

    // #[arg(short, long, action = ArgAction::SetTrue)]
    // verbose: bool,
}

fn main() -> std::io::Result<()> {
    let args = Args::parse();
    println!("Starting directory rendering process");
    println!("Input: {}", args.input.display());
    println!("Output: {}", args.output.display());
    wiki::render_directory(&args.input, &args.output)?;
    println!("Directory rendering complete!");
    Ok(())
}
