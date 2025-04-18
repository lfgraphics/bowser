import { Loader2 } from 'lucide-react'

const Loading = () => {
    return (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
            <Loader2 className="w-10 h-10 text-foreground animate-spin" />
        </div>
    )
}

export default Loading;