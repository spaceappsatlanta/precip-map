Download and process precipitation data from NASA.

First download data from NASA FTP server.

    bash get_data.sh

Then extract the precipitation data from downloaded files

    python extract_json.py

This extract requires the Python bindings for the HDF4 library 'pyhdf'

Lastly, create the json formats of the data for visualization code

    python write_json.py

This will create several files of the format precipAxB.json where A and B
is the degree of decreased resolution in the lattitude and longitude directions,
respectively. Decreased resolution files are smaller. Any one of these files
can be copied to visualization directory as precip.json. E.g:

    cp precip3x3.json ../
