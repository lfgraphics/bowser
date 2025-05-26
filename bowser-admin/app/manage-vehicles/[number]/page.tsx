const page = ({ params }: { params: { number: string } }) => {
    return (
        <div>
            <h1>Manage Vehicle: {params.number}</h1>
        </div>
    );
}

export default page;