use std::{
    collections::VecDeque,
    fs::{self, File},
    io::{self, Read, Write},
    path::Path,
};

use entry::Entry;
use pulldown_cmark::{Options, Parser};
use ramhorns::Ramhorns;

mod entry; // TODO: should this be pub?


fn handle_file<P: AsRef<Path>>(input_path: &P, output_path: &P, templates: &Ramhorns) -> io::Result<()> {
    let mut content = String::new();
    let input_path = input_path.as_ref();
    let mut output_path = output_path.as_ref().to_path_buf();

    if let Some(ext) = input_path.extension().and_then(|ext| ext.to_str()) {
        match ext {
            // assume an entry
            "md" => {
                File::open(input_path)?.read_to_string(&mut content)?;
                let entry = Entry::from_str(&content)?;
                let template = templates.get("entry.html").unwrap();
                content = template.render(&entry);
                output_path = output_path.with_extension("html");
                fs::write(output_path, content)?;
            },
            // "html" | "css" | "js"  => {
            _ => {
                fs::copy(input_path, output_path)?;
            },
            // _ => {},
        }
    }


    Ok(())
}

pub fn render_directory<P: AsRef<Path>>(input_dir: P, output_dir: P) -> std::io::Result<()> {
    let input_dir = input_dir.as_ref();
    let output_dir = output_dir.as_ref();
    let templates: ramhorns::Ramhorns = ramhorns::Ramhorns::from_folder("./templates").unwrap();

    if !input_dir.is_dir() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Input is not a directory",
        ));
    }

    fs::create_dir_all(output_dir)?;

    let mut worklist = VecDeque::new();
    worklist.push_back((input_dir.to_path_buf(), output_dir.to_path_buf()));
    while let Some((cur_in, cur_out)) = worklist.pop_front() {
        for entry in fs::read_dir(&cur_in)? {
            let entry = entry?;
            let path = entry.path();

            let file_name = entry.file_name();
            let output_path = cur_out.join(&file_name);

            if path.is_dir() {
                fs::create_dir_all(&output_path)?;

                worklist.push_back((path, output_path));
            } else if path.is_file() {
                handle_file(&path, &output_path, &templates)?;
            }
        }
    }
    Ok(())
}
